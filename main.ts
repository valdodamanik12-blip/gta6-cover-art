// Palm Coast Cover Studio, a gta6-cover-art-01 entry (Node 22, standard library only): the app is this
// directory's app/ folder, plain static files a desktop browser loads offline (app/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies app/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. The app turns any photo and caption into multi-panel GTA-poster-style cover
// art — four layouts, five sunset/neon grades, per-panel crop and position, bold lettering — and exports
// it as a PNG in 1080 x 1080, 1080 x 1350 and 1920 x 1080. Its two sample photos (app/samples/) were
// made for make.fun with an image model and are free to use. Screenshots (the first by name is the cover)
// are in screenshots/; run the program with the command below to rebuild out/.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Pre-flight validation, before anything is copied ---
// Refuses to hand in a broken entry instead of letting the gate refuse it:
// app/index.html must exist, and screenshots/ must hold 3 or 4 images, each at
// most 256 KiB (the scorer's own caps, reference/gate.json).
const appIndex = join(here, 'app', 'index.html');
if (!existsSync(appIndex)) throw new Error(`missing app/index.html (looked in ${appIndex})`);
const shotDir = join(here, 'screenshots');
const shotNames = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => !name.startsWith('.')).sort()
  : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const size = statSync(join(shotDir, name)).size;
  if (!/\.(png|jpe?g)$/i.test(name)) throw new Error(`screenshot ${name} is not a PNG or JPEG`);
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}
const appFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else appFiles.push(path);
  }
})(join(here, 'app'));
const appBytes = appFiles.reduce((total, path) => total + statSync(path).size, 0);
if (appFiles.length > 993) throw new Error(`app/ holds ${appFiles.length} files, over the 993 cap`);
if (appBytes > 50331648) throw new Error(`app/ is ${appBytes} bytes, over the 48 MiB cap`);

// --- Hand in: copy app/ and screenshots/, then write the dossier ---
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Summary for the log, so a run's result is visible without opening the dossier.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`gta6-cover-art-01: app/ ${appFiles.length} files, ${appBytes} bytes; screenshots ${shotNames.join(', ')}; dossier.json ${dossierBytes} bytes -> ${out}`);
