// Flat DeskZen illustrations for public pages. Rasterized to 1200x630 PNG for og:image.
// People are drawn figures. Amber is only used for a slouch cue.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const outDir = resolve(import.meta.dirname, '../public/site/og');
mkdirSync(outDir, { recursive: true });

const bg = '#060807';
const card = '#0b1f17';
const emerald = '#059669';
const deep = '#047857';
const hover = '#065f46';
const mint = '#ECFDF5';
const amber = '#F59E0B';
const ink = '#0F172A';
const skin = '#F0C7AE';
const skinDeep = '#E2B498';
const hair = '#1C1917';

function frame(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${bg}"/>
  <circle cx="920" cy="250" r="300" fill="${hover}" opacity="0.55"/>
  <circle cx="260" cy="520" r="180" fill="${deep}" opacity="0.35"/>
  <rect x="64" y="48" width="1072" height="534" rx="36" fill="${card}"/>
  ${inner}
</svg>`;
}

function laptop(x, y, scale, screen) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="0" y="0" width="210" height="132" rx="12" fill="${ink}" stroke="${emerald}" stroke-width="4"/>
    <rect x="12" y="12" width="186" height="108" rx="8" fill="#06281d"/>
    ${screen}
    <rect x="-18" y="132" width="246" height="14" rx="6" fill="${hover}"/>
  </g>`;
}

function seated({ x, y, slouch = false, arm = 'type' }) {
  const lean = slouch ? 14 : 0;
  const armPath =
    arm === 'up'
      ? `M248 168 C300 80 340 40 360 70`
      : `M236 176 C300 196 330 214 318 236`;
  return `<g transform="translate(${x} ${y}) rotate(${lean} 190 180)">
    <path d="M168 96 C112 108 96 168 132 196" fill="none" stroke="${hair}" stroke-width="18" stroke-linecap="round"/>
    <path d="M150 92 C142 28 236 8 252 78 C262 118 236 142 214 128 C188 150 146 140 144 100 Z" fill="${hair}"/>
    <circle cx="196" cy="86" r="38" fill="${skin}"/>
    <circle cx="226" cy="90" r="7" fill="${skinDeep}"/>
    <path d="M176 70 Q196 78 214 68" fill="none" stroke="${hair}" stroke-width="6" stroke-linecap="round"/>
    <rect x="182" y="118" width="26" height="26" rx="10" fill="${skin}"/>
    <path d="M142 150 C168 132 236 134 268 164 L292 292 L132 292 Z" fill="${mint}"/>
    <path d="${armPath}" fill="none" stroke="${skin}" stroke-width="16" stroke-linecap="round"/>
    <path d="M156 290 L142 392 L196 392 L206 290 Z" fill="${hover}"/>
    <path d="M206 290 L236 386 L286 372 L246 288 Z" fill="${deep}"/>
    <path d="M142 392 H200" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>
    ${slouch ? '' : `<path d="M128 150 C150 118 250 116 286 168" fill="none" stroke="${emerald}" stroke-width="6" stroke-linecap="round" opacity="0.95"/>`}
  </g>`;
}

function standing(x, y) {
  return `<g transform="translate(${x} ${y})">
    <path d="M118 70 C70 84 58 140 92 166" fill="none" stroke="${hair}" stroke-width="16" stroke-linecap="round"/>
    <path d="M104 66 C98 10 186 -6 200 58 C210 96 186 116 166 104 C144 124 100 114 98 74 Z" fill="${hair}"/>
    <circle cx="150" cy="62" r="34" fill="${skin}"/>
    <circle cx="176" cy="66" r="6" fill="${skinDeep}"/>
    <rect x="138" y="92" width="22" height="22" rx="8" fill="${skin}"/>
    <path d="M108 116 C128 104 184 106 206 132 L214 250 L96 250 Z" fill="${mint}"/>
    <path d="M120 140 C70 70 40 20 78 8" fill="none" stroke="${skin}" stroke-width="14" stroke-linecap="round"/>
    <path d="M186 136 C240 60 280 16 250 4" fill="none" stroke="${skin}" stroke-width="14" stroke-linecap="round"/>
    <path d="M112 248 L96 360 L142 360 L150 248 Z" fill="${hover}"/>
    <path d="M156 248 L176 360 L224 360 L206 248 Z" fill="${deep}"/>
    <path d="M92 360 H230" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>
  </g>`;
}

function desk(y = 430) {
  return `<rect x="140" y="${y}" width="920" height="28" rx="10" fill="${hover}"/>
    <rect x="190" y="${y + 28}" width="16" height="90" rx="4" fill="${deep}"/>
    <rect x="990" y="${y + 28}" width="16" height="90" rx="4" fill="${deep}"/>`;
}

function plant(x, y) {
  return `<g transform="translate(${x} ${y})">
    <rect x="18" y="36" width="36" height="28" rx="6" fill="${mint}"/>
    <path d="M36 36 C20 10 8 16 16 34" fill="${emerald}"/>
    <path d="M36 36 C52 8 70 16 58 36" fill="${deep}"/>
    <path d="M36 36 C30 6 44 0 40 34" fill="#10B981"/>
  </g>`;
}

function water(x, y) {
  return `<g transform="translate(${x} ${y})">
    <path d="M18 8 H42 L48 70 H12 Z" fill="#38BDF8" opacity="0.85"/>
    <path d="M16 0 H44 L46 8 H14 Z" fill="${mint}"/>
  </g>`;
}

const scenes = {
  'stop-slouching': frame(`
    ${seated({ x: 230, y: 70 })}
    ${desk(400)}
    ${laptop(640, 232, 1.15, `<rect x="28" y="36" width="130" height="10" rx="5" fill="${emerald}"/><rect x="28" y="56" width="90" height="8" rx="4" fill="${mint}" opacity="0.7"/>`)}
    ${plant(980, 336)}
    <text x="120" y="120" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="700">Sit tall</text>
    <text x="120" y="166" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="22" opacity="0.8">Screen near eye level</text>
  `),
  'afternoon-slump': frame(`
    ${seated({ x: 230, y: 80, slouch: true })}
    ${desk(410)}
    ${laptop(660, 250, 1.05, `<rect x="28" y="40" width="120" height="8" rx="4" fill="${amber}"/>`)}
    ${water(1000, 340)}
    <rect x="120" y="108" width="132" height="44" rx="22" fill="${amber}"/>
    <text x="186" y="138" text-anchor="middle" fill="${ink}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="700">Slouch</text>
    <text x="120" y="196" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="700">3:00</text>
  `),
  'slouch-detector': frame(`
    <rect x="110" y="130" width="280" height="300" rx="28" fill="#06281d"/>
    <circle cx="250" cy="270" r="78" fill="none" stroke="${mint}" stroke-width="10"/>
    <path d="M250 270 L250 214" stroke="${mint}" stroke-width="8" stroke-linecap="round"/>
    <path d="M250 270 L292 292" stroke="${emerald}" stroke-width="8" stroke-linecap="round"/>
    <text x="250" y="160" text-anchor="middle" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="700">Timer</text>
    ${seated({ x: 500, y: 60 })}
    ${desk(400)}
    ${laptop(860, 250, 1, `<circle cx="104" cy="58" r="8" fill="${emerald}"/>`)}
    <text x="860" y="180" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="700">Outline</text>
  `),
  'stand-stretch': frame(`
    ${standing(160, 110)}
    <rect x="140" y="500" width="920" height="10" rx="5" fill="${hover}"/>
    ${plant(980, 436)}
    <text x="620" y="200" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="700">One minute</text>
    <text x="620" y="246" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="22" opacity="0.85">Stand and reach</text>
  `),
  'private-posture': frame(`
    ${seated({ x: 200, y: 60 })}
    ${desk(400)}
    ${laptop(600, 232, 1.15, `<circle cx="104" cy="58" r="10" fill="${emerald}"/>`)}
    <g transform="translate(920 140)">
      <path d="M70 20 L130 44 V100 C130 140 70 164 70 164 C70 164 10 140 10 100 V44 Z" fill="${mint}"/>
      <path d="M70 48 L112 66 V102 C112 128 70 146 70 146 C70 146 28 128 28 102 V66 Z" fill="${emerald}"/>
    </g>
    <text x="120" y="140" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="700">On this device</text>
    <text x="120" y="184" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="22" opacity="0.85">Nothing uploaded</text>
  `),
  'webcam-checker': frame(`
    ${seated({ x: 250, y: 60 })}
    ${desk(400)}
    ${laptop(660, 225, 1.2, `<circle cx="104" cy="20" r="8" fill="${emerald}"/><rect x="36" y="48" width="130" height="10" rx="5" fill="${emerald}"/>`)}
    <circle cx="150" cy="150" r="14" fill="${emerald}"/>
    <text x="180" y="158" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="700">Camera on</text>
    <text x="150" y="200" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="20" opacity="0.8">Checked in the browser</text>
  `),
  'mac-windows': frame(`
    ${seated({ x: 420, y: 50 })}
    ${desk(410)}
    ${laptop(140, 260, 1, `<circle cx="104" cy="58" r="22" fill="none" stroke="${mint}" stroke-width="6"/>`)}
    ${laptop(830, 260, 1, `<rect x="70" y="36" width="28" height="28" rx="4" fill="${emerald}"/><rect x="108" y="36" width="28" height="28" rx="4" fill="${mint}"/><rect x="70" y="72" width="28" height="28" rx="4" fill="${mint}"/><rect x="108" y="72" width="28" height="28" rx="4" fill="${emerald}"/>`)}
    <text x="600" y="120" text-anchor="middle" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="700">Same reminder</text>
  `),
  learn: frame(`
    ${seated({ x: 220, y: 60 })}
    ${desk(400)}
    ${laptop(620, 232, 1.15, `<rect x="28" y="32" width="150" height="12" rx="6" fill="${mint}"/><rect x="28" y="54" width="120" height="8" rx="4" fill="${emerald}"/><rect x="28" y="72" width="90" height="8" rx="4" fill="${emerald}" opacity="0.7"/>`)}
    <text x="120" y="140" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="700">Learn</text>
    <text x="120" y="186" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="22" opacity="0.85">Desk guides</text>
  `),
  about: frame(`
    <circle cx="430" cy="315" r="150" fill="${mint}"/>
    <path d="M330 250 H530 L350 430 H550" fill="none" stroke="${emerald}" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="680" y="300" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="64" font-weight="700">DeskZen</text>
    <text x="680" y="354" fill="${emerald}" font-family="Inter, system-ui, sans-serif" font-size="28">A free posture coach</text>
  `),
  contact: frame(`
    <g transform="translate(360 150)">
      <rect x="0" y="40" width="480" height="300" rx="28" fill="${mint}"/>
      <path d="M0 70 L240 230 L480 70" fill="none" stroke="${emerald}" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M0 40 H480 L240 210 Z" fill="${emerald}"/>
    </g>
    <text x="600" y="130" text-anchor="middle" fill="${mint}" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="700">Write to Alok</text>
  `),
};

for (const [name, svg] of Object.entries(scenes)) {
  const svgPath = resolve(outDir, `${name}.svg`);
  writeFileSync(svgPath, svg);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(resolve(outDir, `${name}.png`), png);
  console.log(`${name}.png ${png.length} bytes`);
}
