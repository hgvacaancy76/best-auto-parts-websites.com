// Step B: content/{slug}.html + components + stores.json -> final pages, sitemap, robots.
import fs from 'node:fs';
import { PAGES, SITE, CRITERIA, MARKETS, CHAIN_H3, GUIDE_SLUGS, HEAD_PHOTOS, FLAGS } from './spec.mjs';
import { r, fail, esc, icon, sprite, isoDate, monthYear, fmtDay, monthYearOf, stripTags } from './lib.mjs';

const data = JSON.parse(fs.readFileSync(r('build/data/stores.json'), 'utf8'));
const metas = JSON.parse(fs.readFileSync(r('build/data/meta.json'), 'utf8'));
const photos = JSON.parse(fs.readFileSync(r('build/data/photos.json'), 'utf8'));
const oemRows = JSON.parse(fs.readFileSync(r('build/data/oem-rows.json'), 'utf8'));
const iconize = (h) => h.replace(/\{\{icon:([a-z-]+)\}\}/g, (m, n) => icon(n, 'icon icon--sm'));
const header = iconize(fs.readFileSync(r('components/header.html'), 'utf8'));
const footer = iconize(fs.readFileSync(r('components/footer.html'), 'utf8'));

// ---------- validation of stores.json ----------
const stores = [...data.stores].sort((a, b) => a.position - b.position);
if (stores.length !== 10) fail(`stores.json: expected 10 stores, found ${stores.length}`);
stores.forEach((s, i) => {
  if (s.position !== i + 1) fail(`stores.json: positions must be 1..10, got ${s.position} at index ${i}`);
  for (const k of ['slug', 'name', 'url']) if (!s[k]) fail(`stores.json: store ${i + 1} field "${k}" missing`);
  for (const k of ['summary', 'best_for', 'strength', 'limitation']) if (!s.card?.[k]) fail(`stores.json: ${s.slug}.card.${k} missing`);
  for (const [k] of CRITERIA) if (!s.criteria?.[k]) fail(`stores.json: ${s.slug}.criteria.${k} missing`);
  for (const [k] of MARKETS) if (!s.countries?.[k]?.status) fail(`stores.json: ${s.slug}.countries.${k}.status missing`);
  if (!s.rating?.platform) fail(`stores.json: ${s.slug}.rating missing`);
});
const domain = (url) => new URL(url).hostname.replace(/^www\./, '');

// ---------- small components ----------
const ext = (href, text, extra = '') => `<a href="${esc(href)}" target="_blank" rel="noopener"${extra}>${text}</a>`;
// Most values share one check date: it is printed once above each table and card list, and a cell shows
// its own date only when it differs. Every value keeps its source link.
const allDates = stores.flatMap((s) => [...CRITERIA.map(([k]) => s.criteria[k].as_of), s.rating.as_of, ...MARKETS.map(([k]) => s.countries[k].as_of)]).filter(Boolean);
const COMMON_DATE = Object.entries(allDates.reduce((m, d) => ({ ...m, [d]: (m[d] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0];
const src = (url, asof) => {
  if (!url) return '';
  const date = asof ? fmtDay(asof) : '';
  const own = asof && asof !== COMMON_DATE;
  return ext(url, `${icon('external-link', 'icon icon--xs')}<span class="${own ? 'src__date' : 'sr-only'}">${own ? '' : 'Source, checked '}${date}</span>`, ` class="src${own ? ' src--dated' : ''}" title="Source, checked ${date}"`);
};
const dateNote = () => `<p class="table-note nc">${icon('calendar-check', 'icon icon--sm')}<span>Sources checked ${fmtDay(COMMON_DATE)}, unless a value shows its own date. ${icon('external-link', 'icon icon--xs')} opens the source.</span></p>`;
const claim = (c) => c?.store_claim && c.value ? '<span class="claim">Store claim</span>' : '';
const cell = (s, key, label) => {
  const c = s.criteria[key];
  if (!c.value) return '<td></td>';
  return `<td data-label="${label}"><span class="cv">${esc(c.value)}<span class="cv__m">${claim(c)}${src(c.source_url, c.as_of)}</span></span></td>`;
};
const storeTh = (s) => `<th scope="row" class="sticky"><span class="store-th"><span class="rank rank--sm">${s.position}</span>${ext(s.url, esc(s.name))}</span></th>`;
const scrollWrap = (label, table) => `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(label)}">${table}</div>`;
// Data tables: full table on wide screens, one card per store below 1100px. No sideways scrolling.
const stackWrap = (label, table) => `${dateNote()}<div class="table-wrap" role="region" aria-label="${esc(label)}">${table}</div>`;
const flag = (key, cls = 'flag') => `<img class="${cls}" src="{{root}}images/flags/${FLAGS[key]}.svg" width="32" height="24" alt="" loading="lazy" decoding="async">`;
const ratingText = (rt) => `${esc(rt.score)}/5, ${esc(rt.count)} reviews on ${esc(rt.platform)}`;

function tableDelivery() {
  const cols = [['ships_to', 'Ships to'], ['delivery_time', 'Delivery time'], ['delivery_cost', 'Delivery cost'], ['import_duties', 'Import duties']];
  return stackWrap('Delivery and import duties by store', `<table class="data-table stack t-delivery"><thead><tr><th scope="col" class="sticky">Store</th>${cols.map(([, l]) => `<th scope="col">${l}</th>`).join('')}</tr></thead><tbody>${stores.map((s) => `<tr>${storeTh(s)}${cols.map(([k, l]) => cell(s, k, l)).join('')}</tr>`).join('')}</tbody></table>`);
}
function tableTerms() {
  const cols = [['catalog_size', 'Catalog size'], ['part_number_search', 'Part number search'], ['oem_aftermarket', 'OEM and aftermarket'], ['returns', 'Returns'], ['payment', 'Payment']];
  return stackWrap('Terms and customer ratings by store', `<table class="data-table stack t-terms"><thead><tr><th scope="col" class="sticky">Store</th>${cols.map(([, l]) => `<th scope="col">${l}</th>`).join('')}<th scope="col">Customer rating</th></tr></thead><tbody>${stores.map((s) => {
    const rt = s.rating;
    const rating = rt.listed && rt.score ? `<td data-label="Customer rating"><span class="cv"><span class="score">${esc(rt.score)}<small>/5</small></span> <span class="score__meta">${esc(rt.count)} reviews, ${esc(rt.platform)}${src(rt.url, rt.as_of)}</span></span></td>` : '<td></td>';
    return `<tr>${storeTh(s)}${cols.map(([k, l]) => cell(s, k, l)).join('')}${rating}</tr>`;
  }).join('')}</tbody></table>`);
}

function storeCard(s) {
  const d = domain(s.url);
  const figure = storeVisual(s, d);
  // Keyword template "{name} auto parts website"; names that already end in "Auto Parts" only add "website".
  const title = CHAIN_H3.has(s.slug) ? (/auto parts$/i.test(s.name) ? `${s.name} website` : `${s.name} auto parts website`) : s.name;
  const crit = CRITERIA.filter(([k]) => s.criteria[k].value).map(([k, label, ic]) => {
    const c = s.criteria[k];
    return `<li><span class="crit__icon">${icon(ic, 'icon icon--sm')}</span><span class="crit__name">${label}</span><span class="crit__val">${esc(c.value)}${claim(c)}${src(c.source_url, c.as_of)}</span></li>`;
  });
  const rt = s.rating;
  if (rt.listed && rt.score) crit.push(`<li><span class="crit__icon">${icon('star', 'icon icon--sm')}</span><span class="crit__name">Customer rating</span><span class="crit__val">${ratingText(rt)}${src(rt.url, rt.as_of)}</span></li>`);
  return `<article class="store-card" id="store-${s.slug}" aria-labelledby="store-${s.slug}-title">
<div class="store-card__head"><span class="rank"><span class="sr-only">Position </span>${s.position}</span><h3 id="store-${s.slug}-title">${esc(title)}</h3></div>
${figure}
<div class="store-card__text" data-card-words="">
<p class="store-card__summary">${esc(s.card.summary)}</p>
<div class="store-card__best">${icon('target', 'icon icon--sm')}<span>${esc(s.card.best_for)}</span></div>
<p class="store-card__pro"><span class="label nc">Strength</span> ${esc(s.card.strength)}</p>
<p class="store-card__con"><span class="label nc">Limitation</span> ${esc(s.card.limitation)}</p>
</div>
<ul class="criteria-list">${crit.join('')}</ul>
${ext(s.url, `Visit ${esc(s.name)}${icon('arrow-up-right', 'icon icon--sm')}`, ' class="visit"')}
</article>`;
}
// Store tile: name, domain, delivery by market and rating, all from stores.json. Not a logo.
function storeVisual(s, d) {
  const rt = s.rating;
  const rated = rt.listed && rt.score;
  const ships = MARKETS.filter(([k]) => s.countries[k].status === 'ships').length;
  const markets = MARKETS.map(([k, short, long]) => {
    const st = s.countries[k].status;
    return `<li class="sv__mkt sv__mkt--${st}">${flag(k, 'sv__flag')}<span class="sv__mkt-name">${short}</span>${st === 'ships' ? `<span class="sv__ok">${icon('check', 'icon icon--xs')}</span>` : st === 'does_not_ship' ? `<span class="sv__no">${icon('x', 'icon icon--xs')}</span>` : ''}</li>`;
  }).join('');
  const stars = rated ? `<div class="sv__rating"><span class="sv__score">${esc(rt.score)}<small>/5</small></span><span class="sv__bar"><i style="width:${(parseFloat(rt.score) / 5 * 100).toFixed(0)}%"></i></span><span class="sv__plat">${esc(rt.platform)}</span></div>` : '';
  const len = s.name.length;
  return `<div class="sv" aria-hidden="true"><span class="sv__pos">${String(s.position).padStart(2, '0')}</span><span class="sv__domain">${esc(d)}</span><span class="sv__name${len > 14 ? ' sv__name--long' : ''}">${esc(s.name)}</span><div class="sv__foot"><div class="sv__ship"><span class="sv__ship-n">${ships}<small>/${MARKETS.length}</small></span><span class="sv__ship-l">markets served</span><ul class="sv__mkts">${markets}</ul></div>${stars}</div></div>`;
}

const cards = () => `${dateNote()}<div class="store-grid">${stores.map(storeCard).join('\n')}</div>`;

const statusMark = (st) => st === 'ships'
  ? `<span class="mark mark--yes">${icon('check', 'icon icon--sm')}</span><span class="sr-only">Ships</span>`
  : st === 'does_not_ship' ? `<span class="mark mark--no">${icon('x', 'icon icon--sm')}</span><span class="sr-only">Does not ship</span>` : '';

function matrix() {
  return scrollWrap('Delivery coverage by store and market', `<table class="data-table matrix"><thead><tr><th scope="col" class="sticky">Store</th>${MARKETS.map(([k, short, long]) => `<th scope="col">${flag(k, 'flag flag--th')}<abbr title="${long}">${short}</abbr></th>`).join('')}</tr></thead><tbody>${stores.map((s) => `<tr>${storeTh(s)}${MARKETS.map(([k]) => `<td>${statusMark(s.countries[k].status)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
    + `<div class="legend nc"><span class="mark mark--yes">${icon('check', 'icon icon--xs')}</span> Ships <span class="mark mark--no">${icon('x', 'icon icon--xs')}</span> Does not ship</div>`;
}

function countryTable(key) {
  const [, , long] = MARKETS.find(([k]) => k === key) || fail(`unknown market ${key}`);
  const cols = [['delivery_time', 'Delivery time'], ['delivery_cost', 'Delivery cost'], ['import_duties', 'Import duties']];
  return stackWrap(`Ranked stores and delivery to ${long}`, `<table class="data-table stack t-country"><thead><tr><th scope="col" class="sticky">Store</th><th scope="col">Delivery to ${long}</th>${cols.map(([, l]) => `<th scope="col">${l}</th>`).join('')}</tr></thead><tbody>${stores.map((s) => {
    const c = s.countries[key];
    const status = c.status === 'not_stated' ? '<td></td>'
      : `<td data-label="Delivery to ${long}"><span class="cv"><span class="status">${statusMark(c.status)}<span>${esc(c.value)}${src(c.source_url, c.as_of)}</span></span></span></td>`;
    return `<tr>${storeTh(s)}${status}${cols.map(([k, l]) => cell(s, k, l)).join('')}</tr>`;
  }).join('')}</tbody></table>`);
}

const ribbon = (items, cls) => {
  const row = items.map((x) => `<span>${esc(x)}</span>`).join('<i aria-hidden="true"></i>');
  return `<div class="ribbon ${cls}" aria-hidden="true"><div class="ribbon__band ribbon__band--dark"><div class="ribbon__track">${row}<i></i>${row}<i></i></div></div><div class="ribbon__band ribbon__band--lime"><div class="ribbon__track">${row}<i></i>${row}<i></i></div></div></div>`;
};

function oemCompare() {
  const col = (i, name) => `<div class="vs__col vs__col--${i === 1 ? 'oem' : 'am'}"><h3>${name}</h3><dl>${oemRows.map((row) => `<div><dt>${esc(row[0])}</dt><dd>${esc(row[i])}</dd></div>`).join('')}</dl></div>`;
  return `<div class="vs nc">${col(1, 'OEM')}<span class="vs__mid" aria-hidden="true">vs</span>${col(2, 'Aftermarket')}</div>`;
}

const landedFormula = () => `<div class="formula nc" aria-hidden="true">${['Part price', 'Shipping and insurance', 'Customs duty', 'Import tax'].map((x, i) => `<span class="formula__item"><span class="formula__n">${i + 1}</span>${x}</span>`).join('<span class="formula__op">+</span>')}<span class="formula__op">=</span><span class="formula__item formula__item--total">Landed cost</span></div>`;

const credits = () => `<ul class="credits nc"><li>${icon('shapes', 'icon icon--sm')}<span>Icons: ${ext('https://lucide.dev/license', 'Lucide')}, ISC License</span></li><li>${icon('type', 'icon icon--sm')}<span>Display typeface: Archivo by Omnibus-Type, <a href="{{root}}fonts/OFL.txt">SIL Open Font License 1.1</a></span></li><li>${icon('flag', 'icon icon--sm')}<span>Country flags: ${ext('https://github.com/lipis/flag-icons', 'flag-icons')}, <a href="{{root}}images/flags/LICENSE.txt">MIT License</a></span></li>${Object.values(photos).map((ph) => `<li>${icon('camera', 'icon icon--sm')}<span>${esc(ph.subject)}: photo by ${esc(ph.author)}, ${ext(ph.licenseUrl, esc(ph.license))}, ${ext(ph.source, 'Wikimedia Commons')}, cropped and resized</span></li>`).join('')}</ul>`;

// Photographs: credit line on the image itself, as CC BY-SA asks.
const photoCredit = (ph) => `<figcaption class="photo-credit">Photo: ${esc(ph.author)}, ${esc(ph.license)}</figcaption>`;
const photoImg = (slug, cls, eager) => {
  const ph = photos[slug] || fail(`photo ${slug} missing in build/data/photos.json`);
  return `<img class="${cls}" src="{{root}}${ph.file}" width="${ph.width}" height="${ph.height}" alt="${esc(ph.alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
};
const heroPhoto = () => `<figure class="hero-photo">${photoImg('hero-audi-e-tron', 'hero-photo__img', true)}${photoCredit(photos['hero-audi-e-tron'])}</figure>`;
function band(slug) {
  const ph = photos[slug];
  const stats = slug === 'porsche-911'
    ? `<ul class="band__stats nc"><li><b>${stores.length}</b><span>stores ranked</span></li><li><b>${CRITERIA.length}</b><span>criteria per store</span></li><li><b>${MARKETS.length}</b><span>markets checked</span></li></ul>` : '';
  return `<figure class="band band--${slug}${stats ? ' band--stats' : ''}">${photoImg(slug, 'band__img', false)}${stats}${photoCredit(ph)}</figure>`;
}
function headVisual(page) {
  if (page.countryKey) {
    const key = page.countryKey;
    const [, , long] = MARKETS.find(([k]) => k === key);
    const ships = stores.filter((s) => s.countries[key].status === 'ships').length;
    const no = stores.filter((s) => s.countries[key].status === 'does_not_ship').length;
    return `<div class="head-flag nc"><img class="head-flag__img" src="{{root}}images/flags/${FLAGS[key]}.svg" width="320" height="240" alt="Flag of ${long}" fetchpriority="high"><div class="head-flag__stats"><div><b>${ships}<small>/${stores.length}</small></b><span>ranked stores state delivery to ${long}</span></div>${no ? `<div><b>${no}<small>/${stores.length}</small></b><span>state they do not ship there</span></div>` : ''}</div></div>`;
  }
  const slug = HEAD_PHOTOS[page.slug];
  if (!slug) return '';
  return `<figure class="head-photo">${photoImg(slug, 'head-photo__img', true)}${photoCredit(photos[slug])}</figure>`;
}

function related(page) {
  const others = GUIDE_SLUGS.filter((x) => x !== page.slug);
  const items = [['', metas[''].h1], ['ranking-methodology', metas['ranking-methodology'].h1], ...others.map((x) => [x, metas[x].h1])];
  return `<section class="block block--related related" aria-labelledby="related-title"><h2 class="h2" id="related-title">Related guides</h2><ul class="related__list">${items.map(([slug, h1]) => `<li class="tile tile--link"><a class="stretched" href="{{root}}${slug ? slug + '/' : ''}">${esc(h1)}</a><span class="tile__go" aria-hidden="true">${icon('arrow-up-right')}</span></li>`).join('')}</ul></section>`;
}

const COUNTRY_KEY = Object.fromEntries(MARKETS.map(([k, , long]) => [long, k]));
function fillData(html, page) {
  html = html.replace(/(<div class="tile[^"]*">)<h3>(United States|United Kingdom|Canada|Australia|Israel)<\/h3>/g, (m, open, name) => `${open}<h3 class="tile__country">${flag(COUNTRY_KEY[name])}<span>${name}</span></h3>`);
  return html.replace(/<!--data:([a-z0-9:-]+)-->/g, (m, key) => {
    if (key === 'table-delivery') return tableDelivery();
    if (key === 'table-terms') return tableTerms();
    if (key === 'cards') return cards();
    if (key === 'matrix') return matrix();
    if (key.startsWith('country-table:')) return countryTable(key.split(':')[1]);
    if (key === 'ribbon-criteria') return ribbon(CRITERIA.map(([, l]) => l), 'ribbon--a');
    if (key === 'ribbon-markets') return ribbon(MARKETS.map(([, , l]) => l), 'ribbon--b');
    if (key === 'oem-compare') return oemCompare();
    if (key === 'landed-formula') return landedFormula();
    if (key === 'credits') return credits();
    if (key === 'related') return related(page);
    if (key === 'hero-photo') return heroPhoto();
    if (key === 'head-visual') return headVisual(page);
    if (key.startsWith('band:')) return band(key.slice(5));
    fail(`unknown data placeholder ${key}`);
  });
}

// ---------- head and JSON-LD ----------
const pageUrl = (slug) => SITE.base + (slug ? `${slug}/` : '');
const OG_IMAGE = `${SITE.base}images/og-default.png`;

function faqFromHtml(html) {
  const out = [];
  const re = /<details class="faq__item"><summary><h3 class="faq__q">([\s\S]*?)<\/h3>[\s\S]*?<\/summary><div class="faq__a">([\s\S]*?)<\/div><\/details>/g;
  let m;
  while ((m = re.exec(html))) out.push({ q: stripTags(m[1]), a: stripTags(m[2]) });
  return out;
}

function jsonLd(page, fm, html) {
  const url = pageUrl(page.slug);
  const publisher = { '@type': 'Organization', name: SITE.name, url: SITE.base };
  const graph = [];
  const crumbs = { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.base },
    { '@type': 'ListItem', position: 2, name: page.nav, item: url },
  ] };
  const article = { '@type': 'Article', headline: fm.h1, description: fm.meta_description, datePublished: fm.date_published, dateModified: isoDate(), inLanguage: 'en', mainEntityOfPage: url, image: OG_IMAGE, author: publisher, publisher };
  if (page.type === 'home') {
    graph.push({ '@type': 'WebSite', name: SITE.name, url: SITE.base, inLanguage: 'en' });
    graph.push(article);
    graph.push({ '@type': 'ItemList', name: fm.h1, itemListOrder: 'https://schema.org/ItemListOrderAscending', numberOfItems: stores.length,
      itemListElement: stores.map((s) => ({ '@type': 'ListItem', position: s.position, name: s.name, url: s.url, item: { '@type': 'Organization', name: s.name, url: s.url } })) });
  } else if (page.type === 'guide') {
    graph.push(article, crumbs);
  } else {
    graph.push({ '@type': page.schema, name: fm.h1, description: fm.meta_description, url, inLanguage: 'en', datePublished: fm.date_published, dateModified: isoDate(), publisher }, crumbs);
  }
  const faq = faqFromHtml(html);
  if (faq.length) graph.push({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

function head(page, fm, html, root) {
  const url = pageUrl(page.slug);
  const css = page.type === 'home' ? 'home' : 'guide';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fm.title)}</title>
<meta name="description" content="${esc(fm.meta_description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0b1011">
<meta property="og:type" content="${page.type === 'home' || page.type === 'guide' ? 'article' : 'website'}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(fm.title)}">
<meta property="og:description" content="${esc(fm.meta_description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${SITE.name}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fm.title)}">
<meta name="twitter:description" content="${esc(fm.meta_description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${root}favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<link rel="preload" href="${root}fonts/archivo-wdth.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}css/global.css">
<link rel="stylesheet" href="${root}css/${css}.css">
${jsonLd(page, fm, html)}
</head>`;
}

// ---------- assemble ----------
export function assembleAll(log = () => {}) {
  const updated = monthYear();
  const results = [];
  PAGES.forEach((page, i) => {
    const label = page.slug || 'index';
    const contentFile = r('content', `${label}.html`);
    if (!fs.existsSync(contentFile)) fail(`content/${label}.html missing (run the Markdown step first)`);
    const fm = metas[page.slug] || fail(`meta for "${label}" missing`);
    const root = page.slug ? '../' : './';
    let main = fillData(fs.readFileSync(contentFile, 'utf8'), page);
    for (const b of page.blocks) if (!main.includes(`data-block="${b.id}"`)) fail(`${label}: block "${b.id}" not found in content/${label}.html`);
    let hdr = header;
    const self = page.slug ? `href="{{root}}${page.slug}/"` : 'href="{{root}}"';
    hdr = hdr.replace(new RegExp(`${self.replace(/[{}]/g, '\\$&')}(?! aria-current)`, 'g'), `${self} aria-current="page"`);
    let doc = `${head(page, fm, main, root)}
<body class="page-${page.type}">
<a class="skip-link" href="#main">Skip to content</a>
{{sprite}}
<div class="shell" id="top">
<header class="site-header">
${hdr}
</header>
<main id="main" class="main main--${page.type}">
${main}
</main>
<footer class="site-footer">
${footer}
</footer>
</div>
</body>
</html>
`;
    doc = doc.replace('{{sprite}}', sprite(doc));
    doc = doc.replace(/\{\{root\}\}/g, root).replace(/\{\{updated\}\}/g, updated).replace(/\{\{year\}\}/g, String(new Date().getUTCFullYear()));
    if (/\{\{|<!--data:/.test(doc)) fail(`${label}: unresolved placeholder left in output`);
    const outDir = page.slug ? r(page.slug) : r();
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(r(page.slug, 'index.html'), doc);
    results.push({ page, bytes: Buffer.byteLength(doc) });
    log(`  [${i + 1}/${PAGES.length}] ${page.slug ? `/${page.slug}/` : '/'}  ${(Buffer.byteLength(doc) / 1024).toFixed(1)} KB`);
  });

  // sitemap + robots
  const lastmod = isoDate();
  fs.writeFileSync(r('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((p) => `  <url><loc>${pageUrl(p.slug)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(r('robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.base}sitemap.xml\n`);
  return results;
}
