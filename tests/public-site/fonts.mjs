// Read-only preparation of existing public font assets for isolated screenshots.
// No application configuration, database connection or mail credential is read.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rules = [];
for (const family of ['Barlow:wght@400;500;600;700', 'Roboto+Condensed:wght@400;500;700']) {
  const response = await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {
    headers: { 'user-agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' },
  });
  if (!response.ok) throw Error('Public font CSS unavailable');
  let css = await response.text();
  for (const url of new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(match => match[1]))) {
    if (new URL(url).hostname !== 'fonts.gstatic.com') throw Error('Unexpected font host');
    const font = await fetch(url);
    if (!font.ok) throw Error('Public font file unavailable');
    css = css.replaceAll(url, `data:font/ttf;base64,${Buffer.from(await font.arrayBuffer()).toString('base64')}`);
  }
  rules.push(css);
}
mkdirSync('.test-runtime', { recursive: true });
writeFileSync('.test-runtime/public-fonts.css', rules.join('\n'));
console.log(`Actual brand fonts saved for browser-only verification: ${resolve('.test-runtime/public-fonts.css')}`);
