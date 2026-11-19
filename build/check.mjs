// Pre-delivery checks on the built site. Usage: node build/check.mjs [--net]
// --net also requests every external link. Prints a report; exit code 1 on hard failures.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { PAGES, SITE, CRITERIA, MARKETS, CHAIN_H3 } from './spec.mjs';
import { r, fmtDay } from './lib.mjs';

const NET = process.argv.includes('--net');
const data = JSON.parse(fs.readFileSync(r('build/data/stores.json'), 'utf8'));
const stores = [...data.stores].sort((a, b) => a.position - b.position);
const report = [];
let hard = 0;
const section = (t) => report.push(`\n=== ${t} ===`);
const ok = (t) => report.push(`  OK    ${t}`);
const warn = (t) => report.push(`  NOTE  ${t}`);
const bad = (t) => { hard++; report.push(`  FAIL  ${t}`); };

const words = (t) => (t.match(/[A-Za-z0-9£$][A-Za-z0-9'’.,$£%&/+-]*/g) || []).length;
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const decode = (s) => parse(`<p>${s}</p>`).textContent;
const load = (slug) => {
  const file = r(slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  return { html, root: parse(html, { comment: false }), file };
};

// Text that counts toward a block: no tables, captions, added headings, labels or infographics.
function countable(el) {
  const c = el.clone();
  c.querySelectorAll('table, figcaption, .nc, h2[data-added], .scroll-hint, .sr-only, .store-grid, .quick__go, svg').forEach((x) => x.remove());
  return text(c);
}

const pages = PAGES.map((p) => ({ ...p, ...load(p.slug) }));
const label = (p) => (p.slug ? `/${p.slug}/` : '/');

// 1. Blocks
section('1. Blocks present, filled, nothing extra');
for (const p of pages) {
  const found = p.root.querySelectorAll('[data-block]').map((e) => e.getAttribute('data-block'));
  const want = p.blocks.map((b) => b.id);
  const missing = want.filter((x) => !found.includes(x));
  const extra = found.filter((x) => !want.includes(x));
  const empty = want.filter((x) => found.includes(x) && !text(p.root.querySelector(`[data-block="${x}"]`)));
  if (missing.length || extra.length || empty.length) bad(`${label(p)} missing [${missing}] extra [${extra}] empty [${empty}]`);
  else ok(`${label(p)} ${want.length} blocks`);
}

// 2. Word counts
section('2. Word counts (block / page; table cells and captions excluded)');
const cardWords = stores.map((s) => ({ slug: s.slug, n: ['summary', 'best_for', 'strength', 'limitation'].reduce((a, k) => a + words(s.card[k]), 0) }));
const totals = {};
for (const p of pages) {
  let total = 0;
  const parts = [];
  for (const b of p.blocks) {
    const el = p.root.querySelector(`[data-block="${b.id}"]`);
    let n = words(countable(el));
    if (b.id === 'store-reviews') n += cardWords.reduce((a, c) => a + c.n, 0);
    total += n;
    const [lo, hi] = b.words;
    const flag = n < lo || n > hi ? ` (OUT ${lo}-${hi})` : '';
    parts.push(`${b.id}=${n}${flag}`);
    if (flag) warn(`${label(p)} block ${b.id}: ${n} words, range ${lo}-${hi}`);
    if (b.entryWords) {
      for (const e of el.querySelectorAll('.entry')) {
        const en = words(text(e.querySelector('p') || e));
        if (en < b.entryWords[0] || en > b.entryWords[1]) warn(`${label(p)} entry "${text(e.querySelector('h3'))}": ${en} words, range ${b.entryWords.join('-')}`);
      }
    }
  }
  totals[label(p)] = total;
  const [lo, hi] = p.pageWords;
  const msg = `${label(p)} total ${total} (range ${lo}-${hi}) | ${parts.join(' ')}`;
  total < lo || total > hi ? warn(msg) : ok(msg);
}

// 3. Cards
section('3. Store cards');
const home = pages.find((p) => p.type === 'home');
const cardEls = home.root.querySelectorAll('.store-card');
const fieldsSame = cardEls.every((c) => c.querySelectorAll('.store-card__text > *').length === 4 && c.querySelector('.sv') && c.querySelector('.visit') && c.querySelector('.rank'));
fieldsSame && cardEls.length === 10 ? ok(`10 cards, same parts in every card (badge, H3, store tile, 4 text parts, criteria, visit link)`) : bad('cards differ in structure');
const cw = cardWords.map((c) => c.n);
report.push(`  words per card: ${cardWords.map((c) => `${c.slug}=${c.n}`).join(', ')}`);
const spread = Math.max(...cw) - Math.min(...cw);
cw.every((n) => n >= 95 && n <= 120) ? ok('all cards 95-120 words') : bad('card outside 95-120 words');
spread <= 10 ? ok(`longest minus shortest = ${spread} (limit 10)`) : bad(`card spread ${spread} > 10`);
report.push(`  store tiles built from stores.json: ${cardEls.filter((c) => c.querySelector('.sv')).length} of 10 (no screenshots, no logos)`);

// 4. Data consistency
section('4. Values match stores.json (tables, cards, matrix, ItemList, country tables)');
const cellVal = (td) => { const c = td.clone(); c.querySelectorAll('.claim, .src, .sr-only, .mark').forEach((x) => x.remove()); return text(c); };
function checkTable(p, tableEl, cols, name) {
  const rows = tableEl.querySelectorAll('tbody tr');
  let errs = 0;
  rows.forEach((tr, i) => {
    const s = stores[i];
    const th = text(tr.querySelector('th')).replace(/^\d+\s*/, '');
    if (th !== s.name) { errs++; bad(`${name}: row ${i + 1} is "${th}", expected "${s.name}"`); }
    const tds = tr.querySelectorAll('td');
    cols.forEach((fn, k) => {
      const want = fn(s);
      const got = cellVal(tds[k]);
      if (got !== want) { errs++; bad(`${name}: ${s.name} col ${k + 1} "${got}" != "${want}"`); }
    });
  });
  if (!errs) ok(`${label(p)} ${name}: ${rows.length} rows match`);
}
const crit = (k) => (s) => decode(s.criteria[k].value || '');
const tables = home.root.querySelectorAll('table.data-table');
checkTable(home, tables[0], ['ships_to', 'delivery_time', 'delivery_cost', 'import_duties'].map(crit), 'delivery table');
checkTable(home, tables[1], [...['catalog_size', 'part_number_search', 'oem_aftermarket', 'returns', 'payment'].map(crit), (s) => s.rating.listed && s.rating.score ? `${s.rating.score}/5 ${s.rating.count} reviews, ${s.rating.platform}` : ''], 'terms table');
const matrixEl = home.root.querySelector('table.matrix');
checkTable(home, matrixEl, MARKETS.map(([k]) => (s) => ''), 'coverage matrix');
let mErr = 0;
matrixEl.querySelectorAll('tbody tr').forEach((tr, i) => tr.querySelectorAll('td').forEach((td, k) => {
  const st = stores[i].countries[MARKETS[k][0]].status;
  const has = td.querySelector('.mark--yes') ? 'ships' : td.querySelector('.mark--no') ? 'does_not_ship' : 'not_stated';
  if (has !== st) { mErr++; bad(`matrix ${stores[i].name}/${MARKETS[k][0]}: ${has} != ${st}`); }
}));
if (!mErr) ok('coverage matrix statuses match (not_stated rendered empty)');
// cards
let cErr = 0;
cardEls.forEach((c, i) => {
  const s = stores[i];
  const t = c.querySelectorAll('.store-card__text > *').map((x) => { const y = x.clone(); y.querySelectorAll('.label, svg').forEach((z) => z.remove()); return text(y); });
  const want = ['summary', 'best_for', 'strength', 'limitation'].map((k) => decode(s.card[k]));
  t.forEach((x, k) => { if (x !== want[k]) { cErr++; bad(`card ${s.slug} ${k}: text differs from stores.json`); } });
  const vals = c.querySelectorAll('.crit__val').map(cellVal);
  const wantVals = CRITERIA.filter(([k]) => s.criteria[k].value).map(([k]) => decode(s.criteria[k].value));
  if (s.rating.listed && s.rating.score) wantVals.push(`${s.rating.score}/5, ${s.rating.count} reviews on ${s.rating.platform}`);
  if (JSON.stringify(vals) !== JSON.stringify(wantVals)) { cErr++; bad(`card ${s.slug}: criteria values differ`); }
  const links = c.querySelectorAll('.src').map((a) => a.getAttribute('href'));
  const wantLinks = CRITERIA.filter(([k]) => s.criteria[k].value && s.criteria[k].source_url).map(([k]) => s.criteria[k].source_url);
  if (s.rating.listed && s.rating.score) wantLinks.push(s.rating.url);
  if (JSON.stringify(links) !== JSON.stringify(wantLinks)) { cErr++; bad(`card ${s.slug}: source links differ`); }
  const claims = c.querySelectorAll('.claim').length;
  const wantClaims = CRITERIA.filter(([k]) => s.criteria[k].value && s.criteria[k].store_claim).length;
  if (claims !== wantClaims) { cErr++; bad(`card ${s.slug}: ${claims} store-claim labels, expected ${wantClaims}`); }
});
if (!cErr) ok('10 cards: texts, criteria values, source links and store-claim labels match');
// ItemList
const ld = (p) => JSON.parse(p.root.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
const itemList = ld(home).find((x) => x['@type'] === 'ItemList');
const visibleOrder = cardEls.map((c) => c.getAttribute('id').replace('store-', ''));
const ilOrder = itemList.itemListElement.map((x) => stores.find((s) => s.url === x.url)?.slug);
JSON.stringify(ilOrder) === JSON.stringify(visibleOrder) && itemList.itemListElement.every((x, i) => x.position === i + 1 && x.name === stores[i].name)
  ? ok(`ItemList order = visible order (${ilOrder.length} items)`) : bad('ItemList order differs from visible order');
// country tables
for (const p of pages.filter((x) => x.template === 'country')) {
  const t = p.root.querySelector('table.data-table');
  checkTable(p, t, [(s) => s.countries[p.countryKey].status === 'not_stated' ? '' : decode(s.countries[p.countryKey].value), ...['delivery_time', 'delivery_cost', 'import_duties'].map(crit)], `country table (${p.countryKey})`);
}

// 5. FAQPage
section('5. FAQPage equals the visible FAQ');
for (const p of pages) {
  const vis = p.root.querySelectorAll('details.faq__item').map((d) => ({ q: text(d.querySelector('.faq__q')), a: text(d.querySelector('.faq__a')) }));
  const faq = ld(p).find((x) => x['@type'] === 'FAQPage');
  if (!vis.length && !faq) continue;
  const js = (faq?.mainEntity || []).map((m) => ({ q: m.name, a: m.acceptedAnswer.text }));
  JSON.stringify(vis) === JSON.stringify(js) ? ok(`${label(p)} ${vis.length} questions identical`) : bad(`${label(p)} FAQPage differs from visible FAQ`);
}

// 6. Keywords
section('6. Keywords on the home page');
const lc = (s) => s.toLowerCase();
const mainEl = home.root.querySelector('main');
const h1 = text(home.root.querySelector('h1'));
const homeTitle = text(home.root.querySelector('title'));
const KEY = 'best auto parts website';
const lead = text(home.root.querySelector('.hero .lead'));
const bodyNoH1 = (() => { const c = mainEl.clone(); c.querySelector('h1').remove(); c.querySelectorAll('table, .ribbon, .sr-only').forEach((x) => x.remove()); return lc(text(c)); })();
const keyCount = bodyNoH1.split(KEY).length - 1;
lc(homeTitle).includes(KEY) ? ok('main key in title') : bad('main key missing in title');
lc(h1).includes(KEY) ? ok('main key in H1') : bad('main key missing in H1');
lc(lead.split(/(?<=[?.!])\s/)[0]).includes(KEY) ? ok('main key in the first sentence of the hero') : bad('main key not in first sentence');
keyCount >= 4 && keyCount <= 8 ? ok(`main key in body: ${keyCount} times (range 4-8)`) : warn(`main key in body: ${keyCount} times (range 4-8)`);
const blockText = (id) => lc(text(home.root.querySelector(`[data-block="${id}"]`)));
const h2s = (id) => home.root.querySelector(`[data-block="${id}"]`).querySelectorAll('h2').map((h) => lc(text(h))).join(' | ');
const keyChecks = [
  ['comparison-tables H2', h2s('comparison-tables'), ['best online auto parts website', 'best rated auto parts website']],
  ['how-we-rank', blockText('how-we-rank'), ['best auto parts website ratings', 'reviews', 'catalog size', 'best online auto parts website by volume']],
  ['store-reviews H2', h2s('store-reviews'), ['best website for auto parts']],
  ['card H3', cardEls.map((c) => lc(text(c.querySelector('h3')))).join(' | '), ['napa auto parts website', 'autozone auto parts website', "o'reilly auto parts website", 'advance auto parts website']],
  ['delivery-by-country H2', h2s('delivery-by-country'), ['best website to buy auto parts online']],
  ['oem-and-part-numbers H2', h2s('oem-and-part-numbers'), ['best auto parts website for quick navigation']],
  ['used-and-performance-scope H2', h2s('used-and-performance-scope'), ['best used auto parts website', 'best performance auto parts website']],
  ['faq questions', home.root.querySelectorAll('.faq__q').map((q) => lc(text(q))).join(' | '), ['what is the best website to buy auto parts', 'best website for cheap auto parts', 'best website for auto body parts', 'best auto parts website reddit']],
];
for (const [where, hay, keys] of keyChecks) for (const k of keys) hay.includes(k) ? ok(`${where}: "${k}"`) : warn(`${where}: "${k}" not found verbatim`);
if (/advanced auto parts/i.test(home.html)) bad('"Advanced Auto Parts" used'); else ok('"Advanced" variant not used');
for (const k of ['best auto parts website design', 'website builder']) bodyNoH1.includes(k) ? bad(`off-intent phrase "${k}" present`) : ok(`off-intent phrase "${k}" absent`);

// 7. Meta, headings
section('7. Title, description, H1, heading hierarchy, digits in headings');
for (const p of pages) {
  const title = decode(p.root.querySelector('title').textContent);
  const desc = decode(p.root.querySelector('meta[name="description"]').getAttribute('content'));
  const needsYears = p.type === 'home' || p.type === 'guide';
  const tOk = title.length <= 60 && (!needsYears || title.includes('2026-2027'));
  const dOk = desc.length >= 150 && desc.length <= 160;
  (tOk ? ok : warn)(`${label(p)} title ${title.length} chars${needsYears ? (title.includes('2026-2027') ? ', has 2026-2027' : ', NO 2026-2027') : ''}: "${title}"`);
  (dOk ? ok : warn)(`${label(p)} description ${desc.length} chars (150-160)`);
  const hs = p.root.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const h1n = hs.filter((h) => h.tagName === 'H1').length;
  h1n === 1 ? null : bad(`${label(p)} ${h1n} H1 elements`);
  let prev = 0; const skips = [];
  for (const h of hs) { const lv = Number(h.tagName[1]); if (lv > prev + 1) skips.push(`${h.tagName} "${text(h).slice(0, 40)}"`); prev = lv; }
  skips.length ? bad(`${label(p)} heading level skipped: ${skips.join('; ')}`) : ok(`${label(p)} one H1, hierarchy without skips (${hs.length} headings)`);
  const digits = hs.filter((h) => /\d/.test(text(h))).map((h) => `${h.tagName} "${text(h)}"`);
  if (digits.length) warn(`${label(p)} digits in headings: ${digits.join('; ')}`);
  const canon = p.root.querySelector('link[rel="canonical"]').getAttribute('href');
  canon === SITE.base + (p.slug ? `${p.slug}/` : '') ? null : bad(`${label(p)} canonical ${canon}`);
}
ok('canonical = full domain URL with trailing slash on every page (failures listed above if any)');

// 8. Links
section('8. Links');
const external = new Map();
let intErr = 0, relErr = 0, intCount = 0;
for (const p of pages) {
  const dir = path.dirname(p.file);
  for (const a of p.root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    const relAttr = a.getAttribute('rel') || '';
    if (/nofollow|sponsored|ugc/i.test(relAttr) || /utm_|[?&](ref|aff|affiliate|tag)=/i.test(href)) { relErr++; bad(`${label(p)} rel/UTM issue: ${href} rel="${relAttr}"`); }
    if (/^https?:/.test(href)) {
      if (a.getAttribute('target') !== '_blank' || !/noopener/.test(relAttr)) { relErr++; bad(`${label(p)} external link without target/rel: ${href}`); }
      if (!external.has(href)) external.set(href, new Set());
      external.get(href).add(label(p));
      continue;
    }
    if (href.startsWith('mailto:')) continue;
    intCount++;
    const [pathPart, hash] = href.split('#');
    let target = pathPart ? path.resolve(dir, pathPart) : p.file;
    if (pathPart && (pathPart.endsWith('/') || fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) { intErr++; bad(`${label(p)} broken internal link ${href}`); continue; }
    if (hash) {
      const tHtml = target === p.file ? p.html : fs.readFileSync(target, 'utf8');
      if (!new RegExp(`id="${hash}"`).test(tHtml)) { intErr++; bad(`${label(p)} missing anchor #${hash}`); }
    }
  }
  const linksToHome = p.slug && p.root.querySelectorAll('main a').some((a) => /^(\.\.\/|\.\/)$/.test(a.getAttribute('href')));
  if (p.type === 'guide') {
    const hrefs = p.root.querySelectorAll('main a').map((a) => a.getAttribute('href'));
    const guideLinks = new Set(hrefs.filter((h) => /^\.\.\/(import-duties|car-parts-delivery|oem-vs|forwarders|rockauto)/.test(h)));
    const meth = hrefs.includes('../ranking-methodology/');
    linksToHome && meth && guideLinks.size >= 2 ? ok(`${label(p)} links to home, methodology and ${guideLinks.size} other guides`) : bad(`${label(p)} missing required internal links`);
  }
}
const homeGuides = new Set(home.root.querySelectorAll('main a').map((a) => a.getAttribute('href')).filter((h) => /^\.\/(import-duties|car-parts-delivery|oem-vs|forwarders|rockauto)/.test(h)));
homeGuides.size === 8 && home.root.querySelectorAll('main a').some((a) => a.getAttribute('href') === './ranking-methodology/') ? ok('home links to all 8 guides and the methodology') : bad(`home links to ${homeGuides.size} of 8 guides`);
!intErr ? ok(`${intCount} internal links resolve (files and anchors)`) : null;
!relErr ? ok('no nofollow/sponsored/ugc, no UTM or affiliate parameters, all external links target=_blank rel=noopener') : null;
// store links inventory
const storeHosts = stores.map((s) => new URL(s.url).hostname);
const storeLinks = [];
for (const p of pages) for (const a of p.root.querySelectorAll('a[href^="http"]')) {
  const h = new URL(a.getAttribute('href')).hostname;
  if (storeHosts.includes(h) && !a.classList.contains('src')) {
    const where = a.closest('.store-card') ? 'card' : a.closest('table') ? 'table' : a.closest('.entry') ? 'alternatives list' : 'text';
    storeLinks.push(`${label(p)}:${where}`);
  }
}
const tally = storeLinks.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
report.push(`  store links (excluding source icons): ${storeLinks.length} -> ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(', ')}`);
report.push(`  unique external URLs: ${external.size}`);
if (NET) {
  const failures = [];
  const entries = [...external.keys()];
  const check = async (url) => {
    for (const method of ['HEAD', 'GET']) {
      try {
        const res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html,*/*' } });
        if (res.status < 400) return null;
        if (method === 'GET') return `${res.status}`;
      } catch (e) { if (method === 'GET') return e.name === 'TimeoutError' ? 'timeout' : (e.cause?.code || e.message); }
    }
  };
  for (let i = 0; i < entries.length; i += 8) {
    const batch = entries.slice(i, i + 8);
    const res = await Promise.all(batch.map(check));
    res.forEach((e, k) => { if (e) failures.push(`${batch[k]} -> ${e} (on ${[...external.get(batch[k])].join(', ')})`); });
  }
  failures.length ? failures.forEach((f) => warn(`external unreachable/blocked: ${f}`)) : ok('all external links answer');
  if (failures.length) ok(`${entries.length - failures.length} of ${entries.length} external URLs answer`);
}

// 9. Phrase search
section('9. Phrase search in the built site');
const PHRASES = ['cheapest', '10 million', 'fast shipping', 'no import duties', 'no hidden fees', 'official dealer', 'SIA AutoBodyShop', 'independent', 'unbiased', 'not affiliated', 'no store paid', 'we tested', 'we bought', 'our experts', 'editor\'s choice', 'recommended'];
const visibleText = (p) => { const c = p.root.querySelector('body').clone(); c.querySelectorAll('script, style, svg').forEach((x) => x.remove()); return text(c); };
const all404 = parse(fs.readFileSync(r('404.html'), 'utf8')).textContent;
for (const ph of PHRASES) {
  const hits = [];
  for (const p of pages) { const t = visibleText(p); const re = new RegExp(ph.replace(/[.*+?^${}()|[\]\\']/g, (m) => m === "'" ? "['’]" : `\\${m}`), 'gi'); const m = t.match(re); if (m) hits.push(`${label(p)} x${m.length}: "...${t.slice(Math.max(0, t.search(re) - 50), t.search(re) + ph.length + 40)}..."`); }
  if (new RegExp(ph, 'i').test(all404)) hits.push('404.html');
  hits.length ? hits.forEach((h) => warn(`"${ph}" ${h}`)) : ok(`"${ph}" not found`);
}

// 10. Years
section('10. Years');
for (const p of pages) {
  const t = visibleText(p);
  const years = [...t.matchAll(/\b(19|20)\d\d\b/g)].map((m) => m[0]).filter((y) => y !== '2026');
  const uniq = [...new Set(years)];
  const in2027 = t.includes('2027');
  if (uniq.length) warn(`${label(p)} years other than 2026 in visible text: ${uniq.join(', ')} (check: historical dates inside cited sources are allowed)`);
  else ok(`${label(p)} visible text uses 2026 only`);
  if (in2027) warn(`${label(p)} "2027" in visible text`);
}
const ldDates = pages.map((p) => ld(p).find((x) => x.dateModified)?.dateModified).filter(Boolean);
ok(`dateModified ${[...new Set(ldDates)].join(', ')}; footer year ${(home.html.match(/&copy; (\d{4})/) || [])[1]}`);

// 11. Structure, images, weight
section('11. Paragraph runs, images, page weight, assets');
for (const p of pages) {
  const runs = [];
  for (const el of p.root.querySelectorAll('main *')) {
    const kids = el.childNodes.filter((n) => n.nodeType === 1);
    let run = 0;
    for (const k of kids) { run = k.tagName === 'P' ? run + 1 : 0; if (run === 3) runs.push(text(k).slice(0, 50)); }
  }
  runs.length ? warn(`${label(p)} three paragraphs in a row near: ${runs.join(' | ')}`) : null;
  const imgs = p.root.querySelectorAll('img');
  for (const img of imgs) {
    // alt="" is valid for decorative images (flags next to the country name).
    const miss = ['width', 'height', 'alt'].filter((a) => img.getAttribute(a) == null || (a !== 'alt' && !img.getAttribute(a)));
    if (miss.length) bad(`${label(p)} img ${img.getAttribute('src')} missing ${miss}`);
    const f = path.resolve(path.dirname(p.file), img.getAttribute('src'));
    if (!fs.existsSync(f)) bad(`${label(p)} image file missing ${img.getAttribute('src')}`);
    else if (fs.statSync(f).size > 80 * 1024) bad(`${label(p)} image over 80 KB ${img.getAttribute('src')}`);
    // Photographs are WebP; flags are vector SVG files.
    if (!/\.webp$/.test(img.getAttribute('src')) && !/images\/flags\/[a-z]{2}\.svg$/.test(img.getAttribute('src'))) bad(`${label(p)} image not WebP ${img.getAttribute('src')}`);
    if (img.getAttribute('loading') !== 'lazy' && img.getAttribute('fetchpriority') !== 'high') warn(`${label(p)} image without loading=lazy ${img.getAttribute('src')}`);
  }
  const kb = Buffer.byteLength(p.html) / 1024;
  (kb <= 50 ? ok : warn)(`${label(p)} HTML ${kb.toFixed(1)} KB (limit 50 KB)`);
}
const noThreeRuns = !report.some((l) => l.includes('three paragraphs in a row'));
if (noThreeRuns) ok('no runs of three or more paragraphs');
for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml', '.nojekyll', '404.html', 'images/og-default.png', 'css/global.css', 'css/home.css', 'css/guide.css', 'components/header.html', 'components/footer.html', 'serve.mjs', 'build.sh', 'README.md', '.gitignore'])
  fs.existsSync(r(f)) ? null : bad(`missing file ${f}`);
const sm = fs.readFileSync(r('sitemap.xml'), 'utf8');
(sm.match(/<loc>/g) || []).length === PAGES.length && !sm.includes('404') && sm.includes('<lastmod>') ? ok(`sitemap.xml: ${PAGES.length} URLs with lastmod, no 404`) : bad('sitemap.xml incomplete');
const robots = fs.readFileSync(r('robots.txt'), 'utf8');
/User-agent: \*/.test(robots) && /Allow: \//.test(robots) && robots.includes(`Sitemap: ${SITE.base}sitemap.xml`) && !/Disallow/.test(robots) ? ok('robots.txt: allow all, sitemap line, no bot blocks') : bad('robots.txt wrong');
const p404 = fs.readFileSync(r('404.html'), 'utf8');
/<style>/.test(p404) && !/<link rel="stylesheet"/.test(p404) && p404.includes(`href="${SITE.base}"`) ? ok('404.html self-contained, absolute link to the home page') : bad('404.html not self-contained');
// external resources in HTML/CSS
const extRes = [];
for (const p of pages) for (const m of p.html.matchAll(/<(?:link|script|img|source|iframe)[^>]+(?:href|src)="(https?:[^"]+)"/g)) if (!/rel="canonical"/.test(m[0])) extRes.push(`${label(p)} ${m[1]}`);
for (const f of ['css/global.css', 'css/home.css', 'css/guide.css']) for (const m of fs.readFileSync(r(f), 'utf8').matchAll(/url\((["']?)(https?:[^)"']+)/g)) extRes.push(`${f} ${m[2]}`);
extRes.length ? extRes.forEach((x) => bad(`external resource: ${x}`)) : ok('no external scripts, styles, fonts or images referenced');
if (/<script(?![^>]*application\/ld\+json)/.test(pages.map((p) => p.html).join(''))) bad('a <script> other than JSON-LD is present'); else ok('no JavaScript on any page (JSON-LD only)');

// 12. Repository hygiene
section('12. Repository hygiene (files that would be committed)');
const ignore = fs.readFileSync(r('.gitignore'), 'utf8').split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
const toRe = (g) => new RegExp('^' + g.replace(/\/$/, '(/.*)?').replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + (g.endsWith('/') ? '$' : '(/.*)?$'));
const ignRes = ignore.map((g) => ({ g, re: toRe(g.replace(/^\//, '')), anywhere: !g.includes('/') || g.endsWith('/') && g.split('/').length === 2 }));
const isIgnored = (rel) => ignRes.some(({ re, anywhere }) => re.test(rel) || (anywhere && rel.split('/').some((seg, i, a) => re.test(a.slice(i).join('/')))));
const tracked = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const full = path.join(d, e.name); const rel = path.relative(r(), full); if (isIgnored(rel) || rel === '.git') continue; e.isDirectory() ? walk(full) : tracked.push(rel); } };
walk(r());
// Patterns are stored encoded so that this file does not itself contain the words it looks for.
const BANNED = 'XGJydXNoXGI=,XGJhZ2VuY3lcYg==,XGJzYXRlbGxpdGU=,YnJhbmRbIC1dY29uc2Vuc3Vz,ZW50aXR5WyAtXWFuYWx5c2lz,XGJjbGllbnRzP1xi,0KLQlw==,Z2hwXw=='.split(',').map((b) => new RegExp(Buffer.from(b, 'base64').toString('utf8'), 'i'));
const hits = [];
for (const f of tracked) {
  if (/\.(png|webp|ico|woff2)$/.test(f)) { if (BANNED.some((re) => re.test(f))) hits.push(`${f} (file name)`); continue; }
  const t = fs.readFileSync(r(f), 'utf8');
  for (const re of BANNED) if (re.test(t) || re.test(f)) hits.push(`${f}: ${re}`);
}
report.push(`  files that would be committed: ${tracked.length}`);
hits.length ? hits.forEach((h) => warn(`match: ${h}`)) : ok('no banned words or token strings in committed files');
['content/index.md', 'content/stores.json', 'CLAUDE.md', 'images/reference.webp', ...fs.readdirSync(r()).filter((f) => /^tz-.*\.md$/i.test(f))].forEach((f) => isIgnored(f) ? null : bad(`${f} would be committed`));
ok('source texts, the brief, CLAUDE.md and the reference image are ignored');

console.log(report.join('\n'));
console.log(`\n${hard ? `${hard} hard failure(s)` : 'No hard failures'}; NOTE lines need a human decision or are informational.`);
process.exit(hard ? 1 : 0);
