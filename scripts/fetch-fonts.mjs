// One-shot: pull the chosen Fontshare faces into public/fonts/ and emit src/fonts.css
// Combo C — Sentient (serif) + Supreme (sans) + Azeret Mono (mono). ITF Free licence.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/fonts');

const WANT = [
  { slug: 'sentient', family: 'Sentient', weights: [200, 300, 400, 700] },
  { slug: 'supreme', family: 'Supreme', weights: [200, 300, 400, 500, 700] },
  { slug: 'azeret-mono', family: 'Azeret Mono', weights: [400, 500] },
];

await mkdir(outDir, { recursive: true });
const faces = [];

for (const { slug, family, weights } of WANT) {
  const url = `https://api.fontshare.com/v2/css?f[]=${slug}@${weights.join(',')}&display=swap`;
  const css = await fetch(url).then((r) => r.text());

  for (const block of css.split('@font-face').slice(1)) {
    const fam = block.match(/font-family:\s*'([^']+)'/)?.[1];
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    const style = block.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal';
    const woff2 = block.match(/url\('([^']+\.woff2)'\)/)?.[1];
    if (!fam || !weight || !woff2 || style !== 'normal') continue;
    if (fam !== family || !weights.includes(Number(weight))) continue;

    const file = `${slug}-${weight}.woff2`;
    // Fontshare serves protocol-relative URLs (//cdn.fontshare.com/...).
    const href = woff2.startsWith('//') ? `https:${woff2}` : woff2;
    const buf = Buffer.from(await fetch(href).then((r) => r.arrayBuffer()));
    await writeFile(resolve(outDir, file), buf);
    faces.push({ family, weight, file, bytes: buf.length });
    console.log(`${file.padEnd(24)} ${(buf.length / 1024).toFixed(1)} KB`);
  }
}

const css = `/* Fontshare — auto-hébergé par scripts/fetch-fonts.mjs. Ne pas éditer à la main. */
${faces
  .map(
    (f) => `@font-face {
  font-family: '${f.family}';
  src: url('/fonts/${f.file}') format('woff2');
  font-weight: ${f.weight};
  font-style: normal;
  font-display: swap;
}`,
  )
  .join('\n')}
`;

await writeFile(resolve(root, 'src/fonts.css'), css);
console.log(`\n${faces.length} faces -> src/fonts.css`);
