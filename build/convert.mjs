// Step A: supplied Markdown -> content/{slug}.html (inner markup of <main>).
// Store data components stay as <!--data:...--> placeholders and are filled by assemble.mjs
// from stores.json, so every value has one source.
import fs from 'node:fs';
import { PAGES, REMOVALS, REPLACEMENTS, DROPPED_BLOCKS } from './spec.mjs';
import { r, fail, esc, icon, inline, tokens, sentences, parseMd, linkRules } from './lib.mjs';
import { marked } from 'marked';

const data = JSON.parse(fs.readFileSync(r('build/data/stores.json'), 'utf8'));
const storeUrlByName = new Map([
  ...data.stores.map((s) => [s.name.toLowerCase(), s.url]),
  ...data.alternatives_extra.map((s) => [s.name.toLowerCase(), s.url]),
]);

const readMd = (slug) => {
  const file = `${slug || 'index'}.md`;
  const p = r('content', file);
  if (!fs.existsSync(p)) fail(`content/${file} is missing`);
  let raw = fs.readFileSync(p, 'utf8');
  for (const rm of REMOVALS.filter((x) => x.file === file)) {
    if (!raw.includes(rm.text)) fail(`content/${file}: sentence to remove not found: "${rm.text.trim()}"`);
    raw = raw.replace(rm.text, '');
  }
  for (const rp of REPLACEMENTS.filter((x) => x.file === file)) {
    if (!raw.includes(rp.from)) fail(`content/${file}: text to replace not found: "${rp.from.slice(0, 60)}..."`);
    raw = raw.replace(rp.from, rp.to);
  }
  return parseMd(raw, `content/${file}`);
};

// Icon chosen by the topic of a checklist point.
const autoIcon = (t) => /return/i.test(t) ? 'rotate-ccw'
  : /invoice|receipt/i.test(t) ? 'file-text'
  : /OEM|VIN|part number/i.test(t) ? 'scan-barcode'
  : /address|checkout|ships? to/i.test(t) && !/VAT|GST|tax|dut/i.test(t) ? 'map-pin'
  : /VAT|GST|tax|dut/i.test(t) ? 'receipt-text'
  : /forwarder/i.test(t) ? 'package'
  : 'circle-check';

// ---------- token rendering ----------
const p = (t) => `<p>${inline(t.text)}</p>`;
const DATA_COMMENT = { 'table: delivery': 'table-delivery', 'table: terms': 'table-terms', 'cards: stores': 'cards' };

function renderToken(t, opts, ctx) {
  switch (t.type) {
    case 'space': return '';
    case 'paragraph': return p(t);
    case 'heading':
      if (t.depth === 2) { ctx.h2n = (ctx.h2n || 0) + 1; ctx.firstH2 = true; return `<h2 class="h2" id="${opts.id}-title${ctx.h2n > 1 ? `-${ctx.h2n}` : ''}">${inline(t.text)}</h2>`; }
      return `<h${t.depth}>${inline(t.text)}</h${t.depth}>`;
    case 'html': {
      const m = t.text.match(/<!--\s*(.*?)\s*-->/);
      if (m && DATA_COMMENT[m[1]]) return `<!--data:${DATA_COMMENT[m[1]]}-->`;
      fail(`${opts.page}#${opts.id}: unexpected HTML "${t.text.trim()}"`);
    }
    case 'list': return renderList(t, opts);
    case 'table': return renderCompareTable(t);
    default: fail(`${opts.page}#${opts.id}: unsupported Markdown token "${t.type}"`);
  }
}

function renderList(t, opts) {
  const items = t.items.map((it) => it.text.trim());
  if (t.ordered && opts.olas === 'steps') {
    return `<ol class="steps">${items.map((x, i) => `<li class="step"><span class="step__n" aria-hidden="true">${i + 1}</span><p>${inline(x)}</p></li>`).join('')}</ol>`;
  }
  if (t.ordered && opts.olas === 'points') {
    const icons = opts.icons === 'auto' ? items.map(autoIcon) : (opts.icons || []);
    if (icons.length < items.length) fail(`${opts.page}#${opts.id}: ${items.length} points but ${icons.length} icons`);
    return `<ol class="points">${items.map((x, i) => {
      const [first, ...rest] = sentences(x);
      const body = opts.id === 'reasons' ? `<strong>${inline(first)}</strong> ${inline(rest.join(' '))}` : inline(x);
      return `<li class="point"><span class="point__icon">${icon(icons[i])}</span><p>${body}</p></li>`;
    }).join('')}</ol>`;
  }
  if (opts.kind === 'sourcelist') {
    return `<ul class="source-list">${items.map((x) => `<li>${icon('external-link', 'icon icon--sm')}<p>${inline(x)}</p></li>`).join('')}</ul>`;
  }
  if (opts.id === 'hero') {
    const icons = ['globe', 'rotate-ccw', 'landmark'];
    return `<ul class="chips">${items.map((x, i) => `<li class="chip"><span class="chip__icon">${icon(icons[i] || 'check')}</span>${inline(x)}</li>`).join('')}</ul>`;
  }
  const tag = t.ordered ? 'ol' : 'ul';
  return `<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${tag}>`;
}

function renderCompareTable(t) {
  const th = t.header.map((h, i) => `<th scope="col"${i === 0 ? ' class="sticky"' : ''}>${inline(h.text)}</th>`).join('');
  const rows = t.rows.map((row) => `<tr>${row.map((c, i) => i === 0
    ? `<th scope="row" class="sticky">${inline(c.text)}</th>`
    : `<td data-label="${esc(t.header[i].text)}"><span class="cv">${inline(c.text)}</span></td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap" role="region" aria-label="${esc(t.header.map((h) => h.text).join(', '))}"><table class="data-table stack compare-table"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Split tokens into: lead tokens, H3 groups (heading + first paragraph), trailing tokens.
function groupH3(toks) {
  const pre = []; const groups = []; const post = [];
  let cur = null;
  for (const t of toks) {
    if (t.type === 'space') continue;
    if (t.type === 'heading' && t.depth === 3) { cur = { title: t.text, body: [] }; groups.push(cur); continue; }
    if (cur && cur.body.length === 0) { cur.body.push(t); continue; }
    if (cur) { post.push(t); cur = null; continue; }
    if (groups.length) post.push(t); else pre.push(t);
  }
  return { pre, groups, post };
}

function renderGroups(groups, opts) {
  const bodyHtml = (g) => g.body.map((t) => renderToken(t, opts, {})).join('');
  switch (opts.h3as) {
    case 'faq':
      return `<div class="faq">${groups.map((g) => `<details class="faq__item"><summary><h3 class="faq__q">${inline(g.title)}</h3><span class="faq__toggle" aria-hidden="true">${icon('plus')}</span></summary><div class="faq__a">${bodyHtml(g)}</div></details>`).join('')}</div>`;
    case 'points': {
      const icons = opts.icons || [];
      return `<div class="points points--h3">${groups.map((g, i) => `<div class="point"><span class="point__icon">${icon(icons[i] || 'check')}</span><div><h3>${inline(g.title)}</h3>${bodyHtml(g)}</div></div>`).join('')}</div>`;
    }
    case 'defs': {
      const icons = opts.icons || [];
      return `<div class="defs">${groups.map((g, i) => `<div class="def"><span class="def__icon">${icon(icons[i] || 'check')}</span><h3>${inline(g.title)}</h3>${bodyHtml(g)}</div>`).join('')}</div>`;
    }
    case 'tiles': {
      const date = opts.checkedDate || fail(`${opts.page}#${opts.id}: no check date found in the page text for the tiles`);
      return `<div class="tiles">${groups.map((g) => `<div class="tile"><h3>${inline(g.title)}</h3>${bodyHtml(g)}<p class="tile__meta nc">${icon('calendar-check', 'icon icon--sm')}<span>Checked ${esc(date)}</span></p></div>`).join('')}</div>`;
    }
    case 'linktiles':
      return `<div class="tiles tiles--links">${groups.map((g) => {
        const html = bodyHtml(g).replace(/<a href="\{\{root\}\}/, '<a class="stretched" href="{{root}}');
        return `<div class="tile tile--link"><h3>${inline(g.title)}</h3>${html}<span class="tile__go" aria-hidden="true">${icon('arrow-up-right')}</span></div>`;
      }).join('')}</div>`;
    case 'entries':
      return `<div class="entries">${groups.map((g) => {
        let title = inline(g.title);
        if (opts.linkStores) {
          const url = storeUrlByName.get(g.title.toLowerCase()) || fail(`${opts.page}: no store URL for "${g.title}"`);
          title = `<a href="${url}" target="_blank" rel="noopener">${title}</a>`;
        }
        return `<article class="entry"><h3>${title}</h3>${bodyHtml(g)}</article>`;
      }).join('')}</div>`;
    default:
      return groups.map((g) => `<h3>${inline(g.title)}</h3>${bodyHtml(g)}`).join('');
  }
}

// ---------- block renderer ----------
function renderBlock(md, opts) {
  const toks = tokens(md);
  let inner = '';
  const ctx = {};

  if (opts.kind === 'split-steps') {
    const para = toks.filter((t) => t.type === 'paragraph');
    if (para.length !== 1) fail(`${opts.page}#${opts.id}: expected one paragraph for step split`);
    const s = sentences(para[0].text);
    const used = opts.groups.flat();
    if (Math.max(...used) >= s.length) fail(`${opts.page}#${opts.id}: step groups exceed ${s.length} sentences`);
    const steps = opts.groups.map((g, i) => `<li class="step"><span class="step__n" aria-hidden="true">${i + 1}</span><p>${inline(g.map((k) => s[k]).join(' '))}</p></li>`).join('');
    const rest = s.filter((_, k) => !used.includes(k));
    inner = `<ol class="steps">${steps}</ol>${rest.length ? `<p>${inline(rest.join(' '))}</p>` : ''}`;
  } else if (opts.kind === 'checklist') {
    const para = toks.filter((t) => t.type === 'paragraph');
    const s = para.flatMap((t) => sentences(t.text));
    inner = `<ul class="checklist">${s.map((x) => `<li>${icon('check', 'icon icon--check')}<span>${inline(x)}</span></li>`).join('')}</ul>`;
  } else if (opts.kind === 'log') {
    inner = toks.filter((t) => t.type === 'paragraph').map((t) => {
      const m = t.text.match(/^([^:]+):\s*([\s\S]*)$/);
      return m ? `<p class="log"><strong>${inline(m[1])}:</strong> ${inline(m[2])}</p>` : p(t);
    }).join('');
  } else if (opts.kind === 'submit') {
    inner = toks.map((t) => renderToken(t, opts, ctx)).join('')
      .replace(/href="mailto:([^"?]+)"/, (m, a) => `class="button" href="mailto:${a}?subject=Store%20suggestion"`);
  } else {
    const { pre, groups, post } = groupH3(toks);
    const preHtml = pre.map((t) => renderToken(t, opts, ctx)).join('');
    inner = preHtml + renderGroups(groups, opts) + post.map((t) => renderToken(t, opts, ctx)).join('');
  }

  if (opts.kind === 'sources') inner = `<div class="sources">${icon('file-text', 'icon sources__icon')}<div>${inner}</div></div>`;
  if (opts.kind === 'contact') inner = `<div class="contact-card">${icon('mail', 'icon contact-card__icon')}<div>${inner}</div></div>`;

  // Data components from stores.json, placed where the text expects them.
  if (opts.data) {
    const ph = `<!--data:${opts.data}-->`;
    if (opts.data === 'matrix') inner = inner.replace(/(<\/h2>)/, `$1${ph}`);
    else if (opts.data === 'oem-compare') inner = inner.replace(/(<\/p>)/, `$1${ph}`);
    else if (opts.data === 'landed-formula') inner = ph + inner;
    else inner += ph;
    if (!inner.includes(ph)) fail(`${opts.page}#${opts.id}: could not place ${opts.data}`);
  }

  const h2 = opts.h2 ? `<h2 class="h2" id="${opts.id}-title" data-added="">${esc(opts.h2)}</h2>` : '';
  const labelled = opts.h2 || /<h2 /.test(inner) ? ` aria-labelledby="${opts.id}-title"` : '';
  let body = h2 + inner;
  if (opts.wrap === 'callout') body = `<div class="callout">${body}</div>`;
  if (opts.wrap === 'answer') body = `<div class="answer">${icon('circle-check', 'icon answer__icon')}<div>${body}</div></div>`;
  return `<section class="block block--${opts.id}" id="${opts.id}" data-block="${opts.id}"${labelled}>\n${body}\n</section>`;
}

// ---------- page ----------
const BYLINE = `<p class="byline">${icon('pen-line', 'icon icon--sm')}<span>By <a href="{{root}}about/">Editorial team</a></span><span class="byline__sep" aria-hidden="true">/</span><a href="{{root}}editorial-policy/">Editorial policy</a><span class="byline__sep" aria-hidden="true">/</span><span>Last updated: {{updated}}</span></p>`;

export function convertPage(page) {
  const { fm, blocks } = readMd(page.slug);
  const label = page.slug || 'index';
  // Block set must match the specification exactly.
  const want = page.blocks.map((b) => b.id);
  const have = [...blocks.keys()];
  const missing = want.filter((x) => !have.includes(x));
  const dropped = DROPPED_BLOCKS[`${label}.md`] || [];
  const extra = have.filter((x) => !want.includes(x) && !dropped.includes(x));
  if (missing.length) fail(`content/${label}.md: missing blocks: ${missing.join(', ')}`);
  if (extra.length) fail(`content/${label}.md: blocks not in the specification: ${extra.join(', ')}`);
  for (const b of page.blocks) if (!blocks.get(b.id)) fail(`content/${label}.md: block "${b.id}" is empty`);

  const allText = [...blocks.values()].join('\n');
  const dm = allText.match(/checked on (\d{1,2} [A-Z][a-z]+ \d{4})/);
  const checkedDate = dm ? dm[1] : null;

  const out = [];
  if (page.type === 'home') {
    const [a, ...b] = fm.h1.split(':');
    const h1 = b.length ? `<span class="accent">${esc(a)}:</span>${esc(b.join(':'))}` : esc(fm.h1);
    const heroToks = tokens(blocks.get('hero'));
    const heroHtml = heroToks.map((t) => renderToken(t, { page: label, id: 'hero' }, {})).join('');
    const lead = heroHtml.replace(/^<p>/, '<p class="lead">');
    const quick = renderBlock(blocks.get('quick-answer'), { page: label, id: 'quick-answer' })
      .replace('</section>', '<a class="quick__go" href="#comparison-tables"><span>Comparison tables</span>' + icon('arrow-down-right') + '</a>\n</section>');
    out.push(`<div class="hero-wrap">\n<!--data:hero-photo-->\n<section class="block block--hero hero" id="hero" data-block="hero" aria-labelledby="page-title">\n<h1 class="h1" id="page-title">${h1}</h1>\n${lead.replace(/<ul class="chips">/, `${BYLINE}<ul class="chips">`)}\n</section>\n${quick}\n</div>`);
    out.push('<!--data:ribbon-criteria-->');
    for (const b of page.blocks.slice(2)) {
      const opts = { ...b, page: label, checkedDate };
      if (b.id === 'oem-and-part-numbers') opts.oemTable = true;
      if (b.id === 'oem-and-part-numbers') out.push('<!--data:band:mini-engine-bay-->');
      if (b.id === 'faq') out.push('<!--data:band:audi-sport-quattro-->');
      out.push(renderBlock(blocks.get(b.id), opts));
      if (b.id === 'how-we-rank') out.push('<!--data:ribbon-markets-->');
      if (b.id === 'store-reviews') out.push('<!--data:band:porsche-911-->');
    }
  } else {
    out.push(`<section class="page-head" aria-labelledby="page-title">\n<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="{{root}}">Home</a></li><li aria-current="page">${esc(page.nav)}</li></ol></nav>\n<h1 class="h1" id="page-title">${esc(fm.h1)}</h1>\n${page.type === 'guide' || page.byline ? BYLINE : ''}\n<!--data:head-visual-->\n</section>`);
    for (const b of page.blocks) out.push(renderBlock(blocks.get(b.id), { ...b, page: label, checkedDate }));
    if (page.type === 'guide') out.push('<!--data:related-->');
  }
  return { fm, html: out.join('\n') + '\n' };
}

// OEM vs aftermarket rows for the two-column comparison on the home page.
export function oemRows() {
  const { blocks } = readMd('oem-vs-aftermarket-parts');
  const t = tokens(blocks.get('compare-table')).find((x) => x.type === 'table');
  if (!t) fail('oem-vs-aftermarket-parts.md: compare-table has no table');
  return t.rows.map((row) => row.map((c) => c.text));
}

export function convertAll() {
  const metas = {};
  for (const page of PAGES) {
    const { fm, html } = convertPage(page);
    fs.writeFileSync(r('content', `${page.slug || 'index'}.html`), html);
    metas[page.slug] = fm;
  }
  fs.writeFileSync(r('build/data/meta.json'), JSON.stringify(metas, null, 2) + '\n');
  fs.writeFileSync(r('build/data/oem-rows.json'), JSON.stringify(oemRows(), null, 2) + '\n');
  return metas;
}
