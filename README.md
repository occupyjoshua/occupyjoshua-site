# occupyjoshua-site

Personal site: portfolio hub + blog. Look taken from the @occupyjoshua X profile
(lime #c1fd05, violet #3e01fe, black, Press Start 2P + Space Grotesk, `+` marks, the bust).

`npm run build` regenerates everything below; `npm run serve` builds and serves at http://localhost:8080.

- `index.html` — home page, hand-edited, except the blocks between
  `<!-- work:start/end -->` and `<!-- posts:start/end -->`, which the build writes.
- `work/*.md` — one per project. Frontmatter: `title`, `summary`, `poster`, `loop` (files in
  `assets/media/`), optional `tag`, `order`. Body becomes `projects/<slug>.html`.
  Card loops play on hover (mouse) or while in view (touch); off with reduced motion (`assets/previews.js`).
  Optional `live:` (space-separated page URLs) makes the card load one at random, running, instead of
  the loop; the Bible ASCII card uses it to show a live book with its HUD hidden.
- `posts/*.md` — posts written here. Frontmatter: `title`, `date: YYYY-MM-DD`, optional `draft: true`.
- Substack (occupyjoshua.substack.com) — the build fetches `/feed` and writes each post's full
  text to `blog/<slug>.html` with a canonical link and links back to Substack. The last good
  feed is cached in `substack.json`, used when offline. The feed holds only the latest ~20 posts.
- Pinned posts: `PINNED` slugs at the top of `build.js` list first (now `coming-soon`, "Welcome and Introductions").
- `bible/` — copy of the bible-ascii site (committed files, minus demo/, tools, sources), embedded live on
  the Bible ASCII page. Refresh with `npm run sync:bible` after changing ~/Projects/bible-ascii.
- `projects/`, `blog/` — generated; don't edit.
- `assets/media/` — preview clips and stills, cut with ffmpeg from:
  Droplet `~/Projects/droplet/build/trailer/droplet_trailer_16x9.mp4`;
  Contrition `~/Projects/Contrition/docs/review/art_woodcut960s_*` (woodcut trial, 2026-11-10);
  Bible ASCII `bible/<book>/poster.jpg` (thumbs + card loop).
- `assets/bust.webp` — cropped from `~/Pictures/Occupy Profile Picture.png`.

Hosting (ready, not live): GitHub Pages serves the repo root as-is at joshua.occupy.network (`CNAME`).
Run `npm run build` and commit the generated `projects/`, `blog/`, `index.html` — Pages does no build step.
Free Pages needs a public repo, so `bible/` text and the project media go public. To go live:

1. `gh repo create occupyjoshua/occupyjoshua-site --public --source . --push`
2. `gh api -X POST repos/occupyjoshua/occupyjoshua-site/pages -f 'source[branch]=main' -f 'source[path]=/'`
3. DNS at the occupy.network registrar: `CNAME  joshua  occupyjoshua.github.io` (Workspace mail records untouched).
4. Once the cert is issued: `gh api -X PUT repos/occupyjoshua/occupyjoshua-site/pages -f cname=joshua.occupy.network -F https_enforced=true`
5. Point the X bio link at https://joshua.occupy.network and retire Linktree.
