import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync(new URL('../public/logo-mark.svg', import.meta.url));

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  writeFileSync(new URL(`../public/pwa-${size}x${size}.png`, import.meta.url), png);
}
