// Builds the static site:
//   work/*.md    -> projects/<slug>.html + the Work cards on index.html
//   posts/*.md   -> blog/<slug>.html
//   Substack feed -> blog/<slug>.html (full text, linked back to Substack), cached in substack.json
//   blog/index.html + the latest-posts list on index.html
// work/*.md may set `live:` (space-separated page URLs): the card shows one at random, running, instead of the loop.
// Markdown files start with frontmatter:  ---\nkey: value\n---
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { marked } from "marked";
import { createHash } from "node:crypto";

const SUBSTACK = "https://occupyjoshua.substack.com";
const FEATURED = "contrition"; // work slug shown in the intro hero
const PINNED = ["pride"]; // post slugs shown first, in this order

// ?v=<content hash> on assets, so browsers fetch a fresh copy whenever the file changes
const ver = (f) => createHash("md5").update(readFileSync(f)).digest("hex").slice(0, 8);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

function readMd(dir, required) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const src = readFileSync(`${dir}/${f}`, "utf8");
      const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!m) throw new Error(`${dir}/${f}: missing --- frontmatter ---`);
      const meta = Object.fromEntries(m[1].split("\n").map((l) => l.split(/:\s*(.*)/s).slice(0, 2)));
      for (const k of required) if (!meta[k]) throw new Error(`${dir}/${f}: needs ${k}`);
      return { ...meta, slug: f.slice(0, -3), html: marked.parse(m[2]) };
    });
}

// shortcut: regex RSS parsing, fine for Substack's fixed feed format; swap for an XML parser if it breaks.
function parseFeed(xml) {
  const tag = (s, name) => {
    const m = s.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
    return m ? m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").trim() : "";
  };
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const link = tag(it, "link");
    return {
      slug: link.split("/p/")[1].replace(/[^\w-]/g, ""),
      title: tag(it, "title"),
      date: new Date(tag(it, "pubDate")).toISOString().slice(0, 10),
      html: tag(it, "content:encoded"),
      link,
    };
  });
}

async function substackPosts() {
  try {
    const res = await fetch(`${SUBSTACK}/feed`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = parseFeed(await res.text());
    if (!posts.length) throw new Error("feed has no items");
    writeFileSync("substack.json", JSON.stringify(posts, null, 1));
    return posts;
  } catch (e) {
    if (!existsSync("substack.json")) throw new Error(`Substack feed failed (${e.message}) and no substack.json cache`);
    console.warn(`Substack feed failed (${e.message}); using substack.json cache`);
    return JSON.parse(readFileSync("substack.json", "utf8"));
  }
}

// inner pages reuse the home footer (hand-edited in index.html), with relative links pointed up one level
const foot = readFileSync("index.html", "utf8").match(/<footer class="foot">[\s\S]*?<\/footer>/)[0].replace(/(href|src)="(?!https?:|#|\/)/g, '$1="../');
const page = ({ title, description = "", canonical = "" }, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="darkreader-lock">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">\n` : ""}${canonical ? `<link rel="canonical" href="${canonical}">\n` : ""}<link rel="icon" href="../assets/favicon.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css?v=${ver("assets/style.css")}">
</head>
<body>
<div class="wrap">
<nav class="top"><a href="../">+ Joshua</a><a href="../"><img src="../assets/bust.webp" alt="Home"></a></nav>
${body}
</div>
${foot}
</body>
</html>
`;

const replaceBlock = (html, name, content) => {
  const re = new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
  if (!re.test(html)) throw new Error(`index.html: ${name} markers missing`);
  return html.replace(re, `<!-- ${name}:start -->\n    ${content}\n    <!-- ${name}:end -->`);
};

// --- work ---
const work = readMd("work", ["title", "summary", "poster", "loop"]).sort((a, b) => (a.order || 99) - (b.order || 99));
rmSync("projects", { recursive: true, force: true });
mkdirSync("projects");
for (const w of work) {
  writeFileSync(
    `projects/${w.slug}.html`,
    page({ title: `${w.title} — Joshua`, description: w.summary }, `<article class="project">\n<h1>${esc(w.title)}</h1>\n<p class="date">${esc(w.tag || "")}</p>\n${w.html}</article>`),
  );
}
// Work section: one row per project, the same preview + text layout as the intro hero, staggered across the screen
const cards = `<div class="projects">\n${work
  .map(
    (w) => `      <div class="spot left">
        <a class="preview" href="projects/${w.slug}.html" tabindex="-1" aria-hidden="true"${w.live ? ` data-live="${esc(w.live)}"` : ""}><video muted loop playsinline preload="none" poster="assets/media/${w.poster}" src="assets/media/${w.loop}"></video></a>
        <div class="feature">
          ${w.tag ? `<div class="chips"><span class="tag">${esc(w.tag)}</span></div>` : ""}
          <h3><a href="projects/${w.slug}.html">${esc(w.title)}</a></h3>
          <p>${esc(w.summary)}</p>
          <p class="go"><a class="read" href="projects/${w.slug}.html">Project page</a></p>
        </div>
      </div>`,
  )
  .join("\n")}\n    </div>`;

// --- writing ---
const local = readMd("posts", ["title", "date"])
  .filter((p) => p.draft !== "true")
  .map((p) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new Error(`posts/${p.slug}.md: date must be YYYY-MM-DD`);
    return p;
  });
const substack = await substackPosts();
const clash = substack.find((s) => local.some((p) => p.slug === s.slug));
if (clash) throw new Error(`posts/${clash.slug}.md has the same slug as a Substack post`);
const pin = (p) => (PINNED.includes(p.slug) ? PINNED.indexOf(p.slug) : PINNED.length);
const posts = [...local, ...substack].sort((a, b) => pin(a) - pin(b) || b.date.localeCompare(a.date));

rmSync("blog", { recursive: true, force: true });
mkdirSync("blog");
for (const p of posts) {
  const viaSubstack = p.link
    ? `<p class="substack">This is also on Substack. <a href="${p.link}">Comment there</a> or <a href="${SUBSTACK}/subscribe">subscribe</a>.</p>\n`
    : p.x
      ? `<p class="substack">This is also on X. <a href="${esc(p.x)}">Reply there</a>.</p>\n`
      : "";
  writeFileSync(
    `blog/${p.slug}.html`,
    page({ title: p.title, canonical: p.link || p.x }, `<article>\n<h1>${esc(p.title)}</h1>\n<p class="date">${fmt(p.date)}</p>\n${p.html}\n${viaSubstack}</article>`),
  );
}

// first ~160 chars of the post as plain text; tags are stripped and entities left as-is (they contain no spaces, so the word cut never splits one)
const excerpt = (html, n = 160) => {
  const t = html.replace(/<[^>]+>|&#9;|&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, t.lastIndexOf(" ", n)) + "…" : t;
};
const list = (items, prefix, withExcerpt = false) =>
  items.length
    ? `<ul class="posts">\n${items.map((p) => `  <li><time datetime="${p.date}">${fmt(p.date)}</time><a href="${prefix}${p.slug}.html">${esc(p.title)}</a>${PINNED.includes(p.slug) ? ' <span class="pinned">Pinned</span>' : ""}${withExcerpt ? `<p class="excerpt">${excerpt(p.html)}</p>` : ""}</li>`).join("\n")}\n</ul>`
    : `<p class="handle">Nothing yet.</p>`;
writeFileSync("blog/index.html", page({ title: "Writing — Joshua" }, `<article>\n<h1>Writing</h1>\n${list(posts, "")}\n<p class="substack"><a href="${SUBSTACK}/subscribe">Subscribe on Substack</a></p>\n</article>`));

let home = readFileSync("index.html", "utf8");
home = home.replace(/assets\/(style\.css|previews\.js)(\?v=\w+)?"/g, (m, f) => `assets/${f}?v=${ver(`assets/${f}`)}"`);
home = replaceBlock(home, "work", cards);
// intro hero, left: the featured project, linking on to Work
const star = work.find((w) => w.slug === FEATURED);
home = replaceBlock(home, "spot", star
  ? `<div class="spot left">
      <a class="preview" href="projects/${star.slug}.html" tabindex="-1" aria-hidden="true"><video muted loop playsinline preload="none" poster="assets/media/${star.poster}" src="assets/media/${star.loop}"></video></a>
      <div class="feature">
        <div class="chips"><span class="pinned">Featured</span>${star.tag ? `<span class="tag">${esc(star.tag)}</span>` : ""}</div>
        <h3><a href="projects/${star.slug}.html">${esc(star.title)}</a></h3>
        <p>${esc(star.summary)}</p>
        <p class="go"><a class="read" href="projects/${star.slug}.html">Project page</a><a class="read" href="#work">All work</a></p>
      </div>
    </div>`
  : "");
// intro hero, right: the first pinned post, linking on to Writing; the home Writing list shows the rest
const lead = posts.find((p) => PINNED.includes(p.slug));
home = replaceBlock(home, "pinned", lead
  ? `<div class="spot right">
      <div class="feature">
        <div class="chips"><span class="pinned">Pinned</span><time datetime="${lead.date}">${fmt(lead.date)}</time></div>
        <h3><a href="blog/${lead.slug}.html">${esc(lead.title)}</a></h3>
        <p>${excerpt(lead.html, 400)}</p>
        <p class="go"><a class="read" href="blog/${lead.slug}.html">Read</a>${lead.link ? `<a class="read" href="${esc(lead.link)}">On Substack</a>` : ""}<a class="read" href="#writing">All writing</a></p>
      </div>
    </div>`
  : "");
home = replaceBlock(home, "posts", list(posts.filter((p) => p !== lead).slice(0, 7), "blog/", true));
writeFileSync("index.html", home);

console.log(`built ${work.length} project(s), ${local.length} local + ${substack.length} Substack post(s)`);
