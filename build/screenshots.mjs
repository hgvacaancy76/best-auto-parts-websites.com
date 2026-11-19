// Captures the first screen of every ranked store (1280x720, en-US, logged out).
// Output: images/stores/{slug}.webp plus images/stores/shots.json (capture dates and status).
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await fs.readFile(path.join(root, 'build/data/stores.json'), 'utf8'));
const outDir = path.join(root, 'images/stores');
const workDir = path.join(root, '.work/shots');
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(workDir, { recursive: true });

const only = process.argv.slice(2);
const manifestPath = path.join(outDir, 'shots.json');
let manifest = {};
try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}

// Standard consent / region buttons, clicked once if present.
const CONSENT = /^(x|×|accept( all)?( cookies)?|allow( all)?( cookies)?|i agree|agree|got it|ok|okay|continue|close|stay on this site|i accept|accept & close|accept and close)$/i;

const headful = process.env.HEADFUL === '1';
const browser = await puppeteer.launch({
  headless: !headful,
  channel: process.env.CHROME_CHANNEL || undefined,
  defaultViewport: null,
  args: ['--lang=en-US', '--disable-blink-features=AutomationControlled', '--window-size=1280,900'],
  ignoreDefaultArgs: ['--enable-automation'],
});

for (const store of data.stores) {
  if (only.length && !only.includes(store.slug)) continue;
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  let status = 'ok';
  let note = '';
  try {
    const res = await page.goto(store.url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(async (e) => {
      note = 'networkidle timeout, used load state';
      return null;
    });
    if (res && res.status() >= 400) { status = 'failed'; note = `HTTP ${res.status()}`; }
    await new Promise((r) => setTimeout(r, 3000));
    // One click on a standard consent button, if any.
    const clicked = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const els = [...document.querySelectorAll('button, a, [role="button"], input[type="button"], span, div')].filter((b) => b.children.length === 0 || b.tagName === 'BUTTON');
      const el = els.find((b) => re.test((b.innerText || b.value || '').trim()) && b.offsetParent !== null);
      if (el) { el.click(); return (el.innerText || el.value || '').trim(); }
      return '';
    }, CONSENT.source);
    if (clicked) { note += (note ? '; ' : '') + `closed "${clicked}"`; await new Promise((r) => setTimeout(r, 6000)); }
    await page.evaluate(() => window.scrollTo(0, 0));
    const png = path.join(workDir, `${store.slug}.png`);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    // Blocked / challenge pages: detect by text.
    const text = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 2000) : '');
    if (/access denied|request unsuccessful|verify you are human|are you a robot|captcha|pardon our interruption|blocked/i.test(text) && text.length < 1500) {
      status = 'failed'; note += (note ? '; ' : '') + 'bot challenge page';
    }
    if (status === 'ok') {
      let q = 70, buf;
      do {
        buf = await sharp(png).webp({ quality: q }).toBuffer();
        q -= 8;
      } while (buf.length > 80 * 1024 && q > 20);
      await fs.writeFile(path.join(outDir, `${store.slug}.webp`), buf);
      note += (note ? '; ' : '') + `${Math.round(buf.length / 1024)} KB`;
    }
  } catch (e) {
    status = 'failed'; note = String(e.message).slice(0, 120);
  }
  manifest[store.slug] = { status, date: new Date().toISOString().slice(0, 10), note };
  console.log(`${store.slug}: ${status} ${note}`);
  await page.close();
}
await browser.close();
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
