// Screenshots of built pages for the design loop.
// Usage: node build/shoot.mjs <url> <out-prefix> [widths...]  -> <out>-<width>-<n>.png segments
import puppeteer from 'puppeteer';
const [url, out, ...w] = process.argv.slice(2);
const widths = w.length ? w.map(Number) : [1440, 320];
const browser = await puppeteer.launch({ headless: true });
for (const width of widths) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 1000 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(url, { waitUntil: 'networkidle0' });
  // Load lazy images by scrolling through the page.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  const { h, overflow } = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - window.innerWidth }));
  const seg = width < 600 ? 2400 : 1800;
  let n = 0;
  for (let y = 0; y < h; y += seg) {
    await page.screenshot({ path: `${out}-${width}-${n++}.png`, clip: { x: 0, y, width, height: Math.min(seg, h - y) }, captureBeyondViewport: true });
  }
  console.log(`${width}px: height ${h}px, ${n} segments, horizontal overflow ${overflow}px`);
  await page.close();
}
await browser.close();
