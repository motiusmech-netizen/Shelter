// Сборка игры в один HTML-файл.
//   dist/yandex/index.html      — для загрузки на Яндекс Игры (с /sdk.js)
//   dist/atom-shelter-yandex.zip — архив для консоли разработчика Яндекс Игр
//   dist/artifact.html          — фрагмент без <html>/<head> для веб-предпросмотра
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

const TITLE = 'Атомное Убежище';
const DESC = 'Стройте подземное убежище, принимайте выживших, отбивайтесь от рейдеров и исследуйте Пустошь.';

const RANGES = {
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};
const FAMILY = { Oswald: 'Oswald', IBMPlexMono: 'IBM Plex Mono', FiraSansCondensed: 'Fira Sans Condensed' };

function fontFaces() {
  const dir = join(src, 'fonts');
  return readdirSync(dir).filter(f => f.endsWith('.woff2')).sort().map(f => {
    const [fam, weight, subset] = f.replace('.woff2', '').split('-');
    const b64 = readFileSync(join(dir, f)).toString('base64');
    return `@font-face{font-family:"${FAMILY[fam]}";font-style:normal;font-weight:${weight.replace('_', ' ')};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2");unicode-range:${RANGES[subset]};}`;
  }).join('\n');
}

const css = readFileSync(join(src, 'style.css'), 'utf8').replace('/*FONTS*/', fontFaces());
const body = readFileSync(join(src, 'body.html'), 'utf8');
const jsDir = join(src, 'js');
const js = readdirSync(jsDir).filter(f => f.endsWith('.js')).sort().map(f => `// ---- ${f} ----\n` + readFileSync(join(jsDir, f), 'utf8')).join('\n');
const script = `(function(){\n${js}\n})();`;

// Проверка синтаксиса
new Function(script);

if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(join(dist, 'yandex'), { recursive: true });

const full = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="description" content="${DESC}">
<title>${TITLE}</title>
<script src="/sdk.js"></script>
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${script}
</script>
</body>
</html>
`;
writeFileSync(join(dist, 'yandex', 'index.html'), full);

const fragment = `<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<style>
${css}
</style>
${body}
<script>
${script}
</script>
`;
writeFileSync(join(dist, 'artifact.html'), fragment);

try {
  execSync('zip -q -j ../atom-shelter-yandex.zip index.html', { cwd: join(dist, 'yandex') });
} catch (e) {
  console.warn('zip недоступен — архив не создан');
}
const kb = n => (n / 1024).toFixed(0) + ' КБ';
console.log('dist/yandex/index.html', kb(full.length));
console.log('dist/artifact.html', kb(fragment.length));
