// Self-contained 404 page: inline styles, absolute link to the home page.
import fs from 'node:fs';
import { r } from './lib.mjs';
import { SITE } from './spec.mjs';

export function build404() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | ${SITE.name}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="${SITE.base}favicon.svg" type="image/svg+xml">
<style>
:root{--lime:#d4fa5a;--ink:#0b1011;--sage:#93a3a2}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--sage);font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#fff;display:grid;place-items:center;padding:16px}
main{position:relative;background:var(--ink);border-radius:28px;padding:56px 32px;max-width:640px;width:100%;text-align:center}
main::after{content:"";position:absolute;left:4%;right:4%;bottom:-10px;height:22px;border-radius:0 0 40px 40px;background:linear-gradient(90deg,var(--lime),#a3cc3a);z-index:-1}
.code{font-weight:900;font-size:clamp(64px,18vw,128px);line-height:1;margin:0;color:var(--lime);letter-spacing:-.02em}
h1{font-size:clamp(22px,5vw,32px);text-transform:uppercase;letter-spacing:.02em;margin:12px 0 28px}
a{display:inline-block;background:#fff;color:var(--ink);text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px}
a:hover{background:var(--lime)}
a:focus-visible{outline:3px solid var(--lime);outline-offset:3px}
</style>
</head>
<body>
<main>
<p class="code" aria-hidden="true">404</p>
<h1>Page not found</h1>
<a href="${SITE.base}">Go to the ${SITE.name} ranking</a>
</main>
</body>
</html>
`;
  fs.writeFileSync(r('404.html'), html);
}
