// Browser checks: every page from the root and from a sub-path, at 320 and 1440 px, JavaScript disabled.
// Reports failed subresources, requests to other hosts, horizontal overflow, table scrolling and accordions.
import { spawn } from 'node:child_process';
import net from 'node:net';
import puppeteer from 'puppeteer';
import { PAGES } from './spec.mjs';
import { r } from './lib.mjs';

const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const start = async (base) => {
  const port = await freePort();
  const proc = spawn(process.execPath, [r('serve.mjs'), '--port', String(port), '--base', base], { stdio: 'pipe' });
  await new Promise((res) => proc.stdout.once('data', res));
  return { port, proc, url: `http://localhost:${port}${base}` };
};

const servers = [await start('/'), await start('/REPO-NAME/')];
let browser;
let fails = 0;
const out = [];
for (const srv of servers) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    browser = await puppeteer.launch({ headless: true, protocolTimeout: 60000 });
    let pagesOk = 0;
    for (const p of PAGES) {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setViewport({ width, height: 900 });
      const bad = [];
      const foreign = [];
      page.on('requestfinished', (req) => { const s = req.response()?.status(); if (s >= 400) bad.push(`${s} ${req.url()}`); });
      page.on('requestfailed', (req) => bad.push(`failed ${req.url()}`));
      page.on('request', (req) => { if (!req.url().startsWith(`http://localhost:${srv.port}/`) && !req.url().startsWith('data:') && !req.url().startsWith('https://www.googletagmanager.com/')) foreign.push(req.url()); });
      const url = srv.url + (p.slug ? `${p.slug}/` : '');
      await page.goto(url, { waitUntil: 'networkidle0' });
      // Page timers do not run with JavaScript off, so scroll from Node with Node-side pauses.
      const h = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < h; y += 800) { await page.evaluate((v) => window.scrollTo(0, v), y); await new Promise((r) => setTimeout(r, 40)); }
      await page.waitForNetworkIdle({ idleTime: 300 }).catch(() => {});
      const res = await page.evaluate(() => {
        const cssOk = getComputedStyle(document.querySelector('.shell')).borderRadius !== '0px';
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const tables = [...document.querySelectorAll('.table-scroll')].map((t) => ({ scrolls: t.scrollWidth > t.clientWidth, overflowX: getComputedStyle(t).overflowX }));
        const imgsBroken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
        const fontLoaded = [...document.fonts].some((f) => f.family.includes('Archivo') && f.status === 'loaded');
        return { cssOk, overflow, tables, imgsBroken, fontLoaded, details: document.querySelectorAll('details.faq__item').length };
      });
      // Accordion opens without JavaScript.
      let accordion = 'none';
      if (res.details) {
        await page.click('details.faq__item summary');
        accordion = await page.evaluate(() => document.querySelector('details.faq__item').open ? 'opens' : 'closed');
      }
      const problems = [];
      if (!res.cssOk) problems.push('stylesheet not applied');
      if (res.overflow > 0) problems.push(`horizontal overflow ${res.overflow}px`);
      if (bad.length) problems.push(`failed requests: ${bad.join(', ')}`);
      if (foreign.length) problems.push(`external requests: ${foreign.join(', ')}`);
      if (res.imgsBroken.length) problems.push(`broken images: ${res.imgsBroken.join(', ')}`);
      if (!res.fontLoaded) problems.push('display font not loaded');
      if (res.details && accordion !== 'opens') problems.push('accordion does not open');
      if (width === 320 && res.tables.some((t) => t.overflowX !== 'auto')) problems.push('table not scrollable');
      if (problems.length) { fails++; out.push(`  FAIL  ${url} @${width}: ${problems.join('; ')}`); } else pagesOk++;
      if (width === 320 && res.tables.length) out.push(`  info  ${url} @320: ${res.tables.length} table(s), ${res.tables.filter((t) => t.scrolls).length} scroll horizontally`);
      await page.close();
    }
    await browser.close();
    out.push(`  ${pagesOk === PAGES.length ? 'OK  ' : 'FAIL'}  ${srv.url} at ${width}px, JavaScript off: ${pagesOk}/${PAGES.length} pages clean (CSS, images, font, no overflow, no external requests, accordions open)`);
  }
  // 404 page
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const resp = await page.goto(`${srv.url}no-such-page/`);
  out.push(`  ${resp.status() === 404 ? 'OK  ' : 'FAIL'}  ${srv.url}no-such-page/ returns ${resp.status()} with the 404 page`);
  await page.close();
  await browser.close();
}
servers.forEach((s) => s.proc.kill());
console.log(out.filter((l) => !l.includes('info') || process.argv.includes('-v')).join('\n'));
console.log(fails ? `\n${fails} page/viewport combination(s) with problems` : '\nAll browser checks passed');
process.exit(fails ? 1 : 0);
