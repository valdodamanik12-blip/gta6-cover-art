# Neon Vice Cover Studio

[![GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_medium=readme)
[![Rank](https://make.fun/badge/gta6-cover-art-01/valdodamanik12-blip/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_medium=readme)
[![Reward](https://make.fun/badge/gta6-cover-art-01/valdodamanik12-blip/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_medium=readme)

**Neon Vice Cover Studio** turns any photo into GTA-style cover art: the
multi-panel poster / loading-screen look with a Vice City neon-sunset grade,
exported as a PNG to share. It runs entirely offline in a desktop browser —
photos are read on your own machine and never uploaded.

## What it does

- **Six multi-panel layouts** — Hero Split, Four Panel, Nine Grid, Triptych,
  Tilted Snaps and Full Bleed — each panel holds its own photo.
- **Any photo, per panel** — load your own photos or use the two kit sample
  photos; each panel gets its own crop (zoom) and position (drag the sliders
  or click a panel to select it), and one button fills every panel with the
  same photo.
- **Five colour grades** — Vice Sunset, Neon Night, Palm Gold, Teal Noir and
  Hot Pink — applied as a warm wash + cool shadow over every panel, with a
  sunset sky, film grain and vignette on top.
- **Caption editing** — a bold outlined title in the genre's lettering style
  (sunset-gradient, white, pink or gold), a neon-script subtitle, and top /
  centre / bottom placement.
- **Export in three sizes** — 1080 × 1080, 1080 × 1350 and 1920 × 1080 PNG,
  one at a time or all three at once. The exported cover opens in a viewer
  so you can check it before downloading.
- **Undo / redo** — every edit is on a history stack (Ctrl+Z / Ctrl+Shift+Z).

## How to run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. No build step, no
network request, no account. Pick a sample photo (or add your own), choose a
layout and a grade, write your caption, and hit **Export PNG**.

## How to hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` with the kit's vendored `buildDossier` library.

## Originality

All art, lettering and code here are original. No Rockstar Games logo,
official artwork, character or font is used anywhere; the title lettering is
drawn with system fonts and the two sample photos are the kit's own
image-model photos. Not affiliated with Rockstar Games.
