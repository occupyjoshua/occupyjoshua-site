// Work card previews: play the loop on hover (mouse) or while the card is in view (touch).
// Cards with data-live instead load one of those pages at random, running, and drop it when inactive.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const hover = matchMedia("(hover: hover)").matches;
const previews = document.querySelectorAll(".card .preview");
const spots = document.querySelectorAll(".spot .preview"); // hero previews play whenever in view

function start(p) {
  if (!p.dataset.live) return p.querySelector("video").play().catch(() => {});
  if (p.querySelector("iframe")) return;
  const pages = p.dataset.live.split(" ");
  const f = document.createElement("iframe");
  f.src = pages[Math.floor(Math.random() * pages.length)];
  f.tabIndex = -1;
  f.setAttribute("aria-hidden", "true");
  f.onload = () => {
    // same-origin page: hide its HUD text, too small to read at card size
    f.contentDocument?.head.insertAdjacentHTML("beforeend", "<style>#head,#mark,#verse,#place,#count{display:none!important}</style>");
    f.classList.add("ready"); // keep the poster until the page has drawn
  };
  p.append(f);
}
function stop(p) {
  if (!p.dataset.live) return p.querySelector("video").pause();
  p.querySelector("iframe")?.remove();
}

if (!reduce && hover) {
  for (const p of previews) {
    const card = p.closest(".card");
    card.addEventListener("mouseenter", () => start(p));
    card.addEventListener("mouseleave", () => stop(p));
  }
} else if (!reduce) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? start(e.target) : stop(e.target))),
    { threshold: 0.75 },
  );
  previews.forEach((p) => io.observe(p));
}
if (!reduce) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? start(e.target) : stop(e.target))), { threshold: 0.5 });
  spots.forEach((p) => io.observe(p));
}
