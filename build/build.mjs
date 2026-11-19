// Entry point: Markdown -> content/*.html (when the source texts are present), then final pages.
import fs from 'node:fs';
import { r, BuildError } from './lib.mjs';
import { PAGES } from './spec.mjs';

try {
  const hasSources = PAGES.every((p) => fs.existsSync(r('content', `${p.slug || 'index'}.md`)));
  if (hasSources) {
    const { convertAll } = await import('./convert.mjs');
    console.log(`Step 1/3: converting ${PAGES.length} source texts to content/*.html`);
    convertAll();
  } else {
    console.log('Step 1/3: source texts not present, using committed content/*.html');
  }
  const { assembleAll } = await import('./assemble.mjs');
  console.log(`Step 2/3: assembling ${PAGES.length} pages`);
  const res = assembleAll((m) => console.log(m));
  console.log(`Step 3/3: 404 page`);
  const { build404 } = await import('./page404.mjs');
  build404();
  console.log(`Done: ${res.length} of ${PAGES.length} pages built, plus 404.html, sitemap.xml and robots.txt`);
} catch (e) {
  if (e instanceof BuildError) { console.error(`\nBUILD FAILED: ${e.message}`); process.exit(1); }
  throw e;
}
