import { chromium } from "@playwright/test";
import path from "node:path";

const outputPath = path.resolve("src-tauri/icons/source-icon.png");

const svg = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="base" x1="180" y1="120" x2="860" y2="940" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#202b35"/>
      <stop offset="1" stop-color="#101820"/>
    </linearGradient>
    <pattern id="grid" width="92" height="92" patternUnits="userSpaceOnUse">
      <path d="M 92 0 L 0 0 0 92" fill="none" stroke="#40505d" stroke-width="1.4" opacity="0.42"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="12" dy="16" stdDeviation="7" flood-color="#04080c" flood-opacity="0.42"/>
    </filter>
    <filter id="arrowShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="7" dy="10" stdDeviation="5" flood-color="#04080c" flood-opacity="0.34"/>
    </filter>
    <marker id="arrowhead" viewBox="0 0 120 120" refX="96" refY="60" markerWidth="2.8" markerHeight="2.8" orient="auto" markerUnits="strokeWidth">
      <path d="M 12 16 L 104 60 L 12 104 Z" fill="#ffb443"/>
    </marker>
  </defs>
  <rect x="28" y="28" width="968" height="968" rx="176" fill="url(#base)"/>
  <rect x="28" y="28" width="968" height="968" rx="176" fill="url(#grid)" opacity="0.6"/>
  <path d="M 238 744 C 388 648 598 616 760 414 C 800 364 826 308 848 252"
        fill="none" stroke="#55d0c9" stroke-width="48" stroke-linecap="round"
        marker-end="url(#arrowhead)" filter="url(#arrowShadow)"/>
  <circle cx="236" cy="742" r="28" fill="#ffb443" filter="url(#arrowShadow)"/>
  <path d="M 238 744 C 388 648 598 616 760 414 C 800 364 826 308 848 252"
        fill="none" stroke="#55d0c9" stroke-width="48" stroke-linecap="round"
        marker-end="url(#arrowhead)" opacity="0.96"/>
  <circle cx="236" cy="742" r="28" fill="#ffb443"/>
  <text x="508" y="682"
        text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Arial, sans-serif"
        font-size="430"
        font-weight="900"
        letter-spacing="-34"
        fill="#fff7df"
        filter="url(#softShadow)">DB</text>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
await page.setContent(`
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body {
          width: 1024px;
          height: 1024px;
          margin: 0;
          background: transparent;
          overflow: hidden;
        }
        svg {
          display: block;
        }
      </style>
    </head>
    <body>${svg}</body>
  </html>
`);
await page.screenshot({ path: outputPath, omitBackground: true });
await browser.close();

console.log(`Wrote ${outputPath}`);
