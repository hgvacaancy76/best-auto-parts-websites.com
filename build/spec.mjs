// Site and page specification: every page, its blocks, word ranges and layout hints.
export const SITE = {
  name: 'Best Auto Parts Websites',
  base: 'https://best-auto-parts-websites.com/',
  email: 'editors@best-auto-parts-websites.com',
  lang: 'en',
};

// Layout hints per block:
//   h2      functional H2 added by the build when the text has none
//   wrap    'callout' | 'answer'
//   h3as    'faq' | 'tiles' | 'linktiles' | 'points' | 'entries' | 'defs'
//   olas    'steps' | 'points'
//   icons   Lucide icon names for points / tiles, in order
//   words   [min, max] for the block text (table cells and captions excluded)
const FAQ = { h2: 'Frequently asked questions', h3as: 'faq' };
const SOURCES = { h2: 'Sources', kind: 'sources' };

const countryPage = (slug, country, key, nav) => ({
  slug, type: 'guide', template: 'country', country, countryKey: key, nav,
  pageWords: [415, 650],
  blocks: [
    { id: 'answer', wrap: 'answer', words: [60, 90] },
    { id: 'stores-table', h2: `Ranked stores and delivery to ${country}`, data: `country-table:${key}`, words: [25, 40] },
    { id: 'market-duties', h2: `Import taxes in ${country}`, words: [70, 110] },
    { id: 'before-you-order', h2: 'Before you order', olas: 'points', icons: 'auto', words: [60, 100] },
    { id: 'forwarder-fallback', h2: `If a store does not ship to ${country}`, wrap: 'callout', words: [50, 80] },
    { id: 'faq', ...FAQ, words: [120, 180] },
    { id: 'sources', ...SOURCES, words: [30, 50] },
  ],
});

export const PAGES = [
  {
    slug: '', type: 'home', template: 'home', nav: 'Ranking',
    pageWords: [2295, 3245],
    blocks: [
      { id: 'hero', words: [70, 100] },
      { id: 'quick-answer', words: [40, 60] },
      { id: 'comparison-tables', words: [50, 90] },
      { id: 'how-we-rank', h2: 'How we rank online auto parts stores', h3as: 'points', icons: ['list-checks', 'calendar-check', 'tag', 'scale'], words: [170, 250] },
      { id: 'store-reviews', words: [980, 1250] },
      { id: 'delivery-by-country', h3as: 'linktiles', data: 'matrix', words: [155, 225] },
      { id: 'import-duties', h2: 'Import duties by market', h3as: 'tiles', words: [140, 210] },
      { id: 'oem-and-part-numbers', olas: 'steps', data: 'oem-compare', words: [150, 220] },
      { id: 'when-store-does-not-ship', h2: 'When a store does not ship to your country', olas: 'steps', words: [90, 140] },
      { id: 'used-and-performance-scope', wrap: 'callout', words: [50, 80] },
      { id: 'faq', ...FAQ, words: [360, 540] },
      { id: 'sources', ...SOURCES, words: [40, 80] },
    ],
  },
  // Trust pages
  {
    slug: 'ranking-methodology', type: 'trust', schema: 'WebPage', nav: 'Methodology', byline: true,
    pageWords: [705, 1035],
    blocks: [
      { id: 'purpose-and-scope', h2: 'Purpose and scope', words: [60, 90] },
      { id: 'selection-rules', h2: 'Selection rules', words: [90, 130] },
      { id: 'criteria-definitions', h2: 'Criteria definitions', h3as: 'defs', icons: ['globe', 'clock', 'truck', 'layers', 'search', 'package', 'rotate-ccw', 'credit-card', 'landmark'], words: [225, 315] },
      { id: 'data-sources-and-dates', h2: 'Data sources and dates', words: [80, 120] },
      { id: 'how-positions-are-set', h2: 'How positions are set', words: [90, 130] },
      { id: 'reputation-data', h2: 'Reputation data', words: [50, 80] },
      { id: 'updates-and-corrections', h2: 'Updates and corrections', words: [50, 80] },
      { id: 'limits', h2: 'Limits', wrap: 'callout', words: [60, 90] },
    ],
  },
  {
    slug: 'editorial-policy', type: 'trust', schema: 'WebPage', nav: 'Editorial policy', byline: true,
    pageWords: [320, 510],
    blocks: [
      { id: 'principles', h2: 'Principles', words: [70, 110] },
      { id: 'sourcing-rules', h2: 'Sourcing rules', words: [80, 120] },
      { id: 'conflicting-data', h2: 'Conflicting data', words: [60, 90] },
      { id: 'corrections', h2: 'Corrections', words: [50, 80] },
      { id: 'store-requests', h2: 'Store requests', words: [40, 70] },
      { id: 'update-log', h2: 'Update log', kind: 'log', words: [20, 40] },
    ],
  },
  {
    slug: 'about', type: 'trust', schema: 'AboutPage', nav: 'About', byline: true,
    pageWords: [180, 290],
    blocks: [
      { id: 'what-this-site-is', h2: 'What this site is', words: [60, 90] },
      { id: 'who-maintains', h2: 'Who maintains the site', words: [40, 70] },
      { id: 'scope-and-audience', h2: 'Scope and audience', words: [60, 90] },
      { id: 'how-to-reach-us', h2: 'How to reach us', wrap: 'callout', words: [20, 40] },
    ],
  },
  {
    slug: 'contact', type: 'service', schema: 'ContactPage', nav: 'Contact',
    pageWords: [60, 100],
    blocks: [{ id: 'email-and-topics', kind: 'contact', words: [60, 100] }],
  },
  {
    slug: 'sources', type: 'trust', schema: 'WebPage', nav: 'Sources', byline: true,
    pageWords: [200, 460],
    blocks: [
      { id: 'authority-sources', h2: 'Authority sources', kind: 'sourcelist', words: [90, 250] },
      { id: 'data-dates', h2: 'Data dates', words: [40, 80] },
      { id: 'images-and-credits', h2: 'Images and credits', data: 'credits', words: [70, 130] },
    ],
  },
  {
    slug: 'privacy-and-cookies', type: 'service', schema: 'WebPage', nav: 'Privacy and cookies',
    pageWords: [150, 250],
    blocks: [{ id: 'data-and-cookies', words: [150, 250] }],
  },
  {
    slug: 'add-a-store', type: 'service', schema: 'WebPage', nav: 'Add a store',
    pageWords: [200, 310],
    blocks: [
      { id: 'who-can-submit', h2: 'Who can submit', words: [60, 90] },
      { id: 'what-to-send', h2: 'What to send', kind: 'checklist', words: [80, 120] },
      { id: 'what-happens-next', h2: 'What happens next', words: [50, 80] },
      { id: 'submit-link', h2: 'Submit a store', kind: 'submit', words: [10, 20] },
    ],
  },
  // Guides
  {
    slug: 'import-duties-car-parts', type: 'guide', nav: 'Import duties on car parts',
    pageWords: [640, 975],
    blocks: [
      { id: 'answer', wrap: 'answer', words: [60, 90] },
      { id: 'market-tiles', h2: 'Import duty rules by country', h3as: 'tiles', words: [175, 250] },
      { id: 'landed-cost', h2: 'How to estimate landed cost', data: 'landed-formula', words: [80, 120] },
      { id: 'before-you-order', h2: 'Before you order', olas: 'points', icons: ['receipt-text', 'truck', 'rotate-ccw', 'file-text', 'landmark'], words: [75, 125] },
      { id: 'part-classification', h2: 'Part classification and HS codes', wrap: 'callout', words: [60, 90] },
      { id: 'faq', ...FAQ, words: [160, 240] },
      { id: 'sources', ...SOURCES, words: [30, 60] },
    ],
  },
  countryPage('car-parts-delivery-uk', 'the United Kingdom', 'uk', 'Car parts delivery to the UK'),
  countryPage('car-parts-delivery-canada', 'Canada', 'canada', 'Car parts delivery to Canada'),
  countryPage('car-parts-delivery-australia', 'Australia', 'australia', 'Car parts delivery to Australia'),
  countryPage('car-parts-delivery-israel', 'Israel', 'israel', 'Car parts delivery to Israel'),
  {
    slug: 'oem-vs-aftermarket-parts', type: 'guide', nav: 'OEM vs aftermarket parts',
    pageWords: [620, 960],
    blocks: [
      { id: 'answer', wrap: 'answer', words: [60, 90] },
      { id: 'compare-table', h2: 'OEM and aftermarket compared', words: [90, 150] },
      { id: 'certifications', h2: 'CAPA and NSF certification', words: [70, 110] },
      { id: 'part-numbers', h2: 'How to match a part by number', kind: 'split-steps', groups: [[0, 1], [2], [3], [4, 5, 6], [7]], words: [120, 180] },
      { id: 'fitment-tools', h2: 'Fitment tools', words: [60, 90] },
      { id: 'faq', ...FAQ, words: [160, 240] },
      { id: 'sources', ...SOURCES, words: [30, 50] },
    ],
  },
  {
    slug: 'forwarders-for-car-parts', type: 'guide', nav: 'Package forwarders for car parts',
    pageWords: [550, 840],
    blocks: [
      { id: 'answer', wrap: 'answer', words: [60, 90] },
      { id: 'how-it-works', h2: 'How package forwarding works', kind: 'split-steps', groups: [[0], [1], [2], [3]], words: [80, 120] },
      { id: 'store-acceptance', h2: 'Will the store accept a forwarder address', wrap: 'callout', words: [50, 80] },
      { id: 'forwarder-list', h2: 'Package forwarders compared', h3as: 'entries', entryWords: [20, 30], words: [140, 210] },
      { id: 'risks', h2: 'Risks to check', words: [70, 110] },
      { id: 'faq', ...FAQ, words: [120, 180] },
      { id: 'sources', ...SOURCES, words: [30, 50] },
    ],
  },
  {
    slug: 'rockauto-alternatives', type: 'guide', nav: 'RockAuto alternatives',
    pageWords: [760, 1070],
    blocks: [
      { id: 'answer', wrap: 'answer', words: [60, 90] },
      { id: 'reasons', h2: 'Why buyers look beyond RockAuto', olas: 'points', icons: ['truck', 'star', 'map-pin'], words: [60, 100] },
      { id: 'alternatives-list', h2: 'RockAuto alternatives compared', h3as: 'entries', linkStores: true, entryWords: [35, 45], words: [420, 540] },
      { id: 'how-to-choose', h2: 'How to choose an alternative', words: [70, 110] },
      { id: 'faq', ...FAQ, words: [120, 180] },
      { id: 'sources', ...SOURCES, words: [30, 50] },
    ],
  },
];

export const GUIDE_SLUGS = [
  'import-duties-car-parts', 'car-parts-delivery-uk', 'car-parts-delivery-canada',
  'car-parts-delivery-australia', 'car-parts-delivery-israel', 'oem-vs-aftermarket-parts',
  'forwarders-for-car-parts', 'rockauto-alternatives',
];

// Sentences removed from the supplied texts on the owner's instruction:
// empty values are not rendered, so text that explains an empty value is removed too.
// Blocks present in the supplied texts but not published, on the owner's instruction
// (they singled out one store).
export const DROPPED_BLOCKS = { 'oem-vs-aftermarket-parts.md': ['store-support'] };

export const REMOVALS = [
  { file: 'import-duties-car-parts.md', text: "### Who pays duties on a Cars245 order?\nCars245 ships from an EU warehouse to buyers worldwide. Buyers outside the EU may pay import duties and taxes in their own country, and the store does not state one duty rule for every destination. Confirm the amount with the carrier or customs office before ordering.\n" },
  { file: 'rockauto-alternatives.md', text: ' Autodoc allows 14 days, with a paid Safe Order option that extends it to 200 days.' },
  { file: 'index.md', text: ' Where a store does not state something, the table says so instead of guessing.' },
  { file: 'about.md', text: ' Where a store does not publish a detail, the page says so.' },
  { file: 'index.md', text: ' Not stated means the page did not give the information on the date we checked.' },
  { file: 'index.md', text: ' A store marked as not stated in a market has not published delivery to that country on the pages we read.' },
  { file: 'car-parts-delivery-uk.md', text: ' Not stated means the page did not list the United Kingdom.' },
  { file: 'car-parts-delivery-canada.md', text: ' Not stated means the page did not list Canada.' },
  { file: 'car-parts-delivery-australia.md', text: ' Not stated means the page did not list Australia.' },
  { file: 'car-parts-delivery-israel.md', text: ' Not stated means the page did not list Israel.' },
  { file: 'ranking-methodology.md', text: ' Where a store states nothing about a country, the table says Not stated instead of guessing.' },
  { file: 'ranking-methodology.md', text: ' A blank or Not stated field means the page did not give that information on the date it was checked.' },
];

export const CRITERIA = [
  ['ships_to', 'Ships to', 'globe'],
  ['delivery_time', 'Delivery time', 'clock'],
  ['delivery_cost', 'Delivery cost', 'truck'],
  ['catalog_size', 'Catalog size', 'layers'],
  ['part_number_search', 'Part number search', 'search'],
  ['oem_aftermarket', 'OEM and aftermarket', 'package'],
  ['returns', 'Returns', 'rotate-ccw'],
  ['payment', 'Payment', 'credit-card'],
  ['import_duties', 'Import duties', 'landmark'],
];

export const MARKETS = [
  ['us', 'US', 'United States'],
  ['uk', 'UK', 'United Kingdom'],
  ['canada', 'Canada', 'Canada'],
  ['australia', 'Australia', 'Australia'],
  ['israel', 'Israel', 'Israel'],
];

// H3 of store cards for the four chains follows "{name} auto parts website".
export const CHAIN_H3 = new Set(['napa', 'autozone', 'oreilly-auto-parts', 'advance-auto-parts']);

// Sentences replaced on the owner's instruction: the store screenshots were replaced by data tiles
// and photographs were added, so the credits text must describe what the site actually shows.
export const REPLACEMENTS = [
  // US de minimis: one wording on every page, checked against Federal Register 2026-12669.
  {
    file: 'import-duties-car-parts.md',
    from: 'Since June 24, 2026, U.S. Customs and Border Protection has suspended the $800 de minimis exemption for shipments that do not arrive by post. For mail, the suspension works through a new postal informal entry process effective July 24, 2026.',
    to: 'The United States has suspended the $800 de minimis exemption for postal and courier shipments, so low-value parcels are no longer exempt from duty. For mail, a Federal Register rule of June 24, 2026 keeps the suspension in place and adds a new postal informal entry process effective July 24, 2026.',
  },
  {
    file: 'import-duties-car-parts.md',
    from: 'The United States suspended its $800 de minimis exemption in 2026,',
    to: 'The United States suspended its $800 de minimis exemption for postal and courier shipments,',
  },
  {
    file: 'index.md',
    from: 'The $800 de minimis exemption is suspended, so low-value parcels are no longer exempt from duty.',
    to: 'The $800 de minimis exemption is suspended for postal and courier shipments, so low-value parcels are no longer exempt from duty.',
  },
  {
    file: 'sources.md',
    from: 'suspension of the de minimis exemption for mail shipments to the United States.',
    to: 'the $800 de minimis exemption stays suspended for mail shipments to the United States, with a new postal informal entry process.',
  },
  // Return windows: one figure for the longest standard window.
  {
    file: 'rockauto-alternatives.md',
    from: "Among the ranked stores, O'Reilly Auto Parts allows 90 days and FCP Euro allows 90 days through its return portal.",
    to: "Among the ranked stores, O'Reilly Auto Parts and FCP Euro allow the longest window, 90 days, FCP Euro through its return portal.",
  },
  {
    file: 'sources.md',
    from: "Store screenshots show the first screen of each store's website, with the domain and the month of capture in the caption. They are used to identify the store and remain the property of the store. Icons and illustrations on this site were made for it.",
    to: "Store tiles in the ranking show each store's name and domain with figures from the comparison tables. They are not store logos, and store names remain the property of their owners. Icons come from Lucide, the display typeface is Archivo, and country flags come from the flag-icons project. Car photographs come from Wikimedia Commons, were cropped and resized for this site, and are credited below with author and license.",
  },
];

// Photographs (build/data/photos.json) shown in page heads and between home page sections.
export const HEAD_PHOTOS = {
  'import-duties-car-parts': 'mercedes-w115',
  'oem-vs-aftermarket-parts': 'wolseley-engine',
  'forwarders-for-car-parts': 'volvo-pv544',
  'rockauto-alternatives': 'porsche-wheel',
};
export const FLAGS = { us: 'us', uk: 'gb', canada: 'ca', australia: 'au', israel: 'il' };
