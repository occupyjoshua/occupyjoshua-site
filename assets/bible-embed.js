// Bible ASCII page: book tiles swap the live iframe; a cover stops the page's scroll wheel
// from zooming the book until the visitor clicks into it.
const live = document.getElementById("live");
const frame = live.querySelector("iframe");
const cover = live.querySelector(".live-cover");

cover.addEventListener("click", () => {
  live.classList.add("active");
  frame.focus();
});
// leaving the embed re-arms the cover, so scrolling past it never zooms
live.addEventListener("mouseleave", () => live.classList.remove("active"));

for (const b of document.querySelectorAll(".book")) {
  b.addEventListener("click", () => {
    document.querySelectorAll(".book").forEach((x) => {
      x.classList.toggle("on", x === b);
      x.setAttribute("aria-pressed", x === b);
    });
    frame.src = `../bible/${b.dataset.book}/?zoom=1&at=${b.dataset.at}`;
    frame.title = `${b.querySelector(".name").textContent}, drawn in its own letters`;
    live.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}
