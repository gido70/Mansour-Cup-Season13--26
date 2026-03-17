document.addEventListener("DOMContentLoaded", () => {
  const items = Array.from(document.querySelectorAll(".gallery-item"));
  const lightbox = document.querySelector(".lightbox");
  const isPhone = window.matchMedia("(max-width: 640px)").matches;

  if (!items.length) return;

  if (isPhone || !lightbox) {
    items.forEach((item) => {
      item.addEventListener("click", (e) => e.preventDefault());
    });
    return;
  }

  const lbImg = lightbox.querySelector("img");
  const btnClose = lightbox.querySelector(".lightbox-close");
  const btnPrev = lightbox.querySelector(".lightbox-prev");
  const btnNext = lightbox.querySelector(".lightbox-next");
  let current = 0;

  function show(index){
    current = (index + items.length) % items.length;
    lbImg.src = items[current].getAttribute("href");
    lightbox.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeBox(){
    lightbox.classList.remove("show");
    lbImg.src = "";
    document.body.style.overflow = "";
  }

  items.forEach((item, idx) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      show(idx);
    });
  });

  if (btnClose) btnClose.addEventListener("click", closeBox);
  if (btnPrev) btnPrev.addEventListener("click", () => show(current - 1));
  if (btnNext) btnNext.addEventListener("click", () => show(current + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeBox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("show")) return;
    if (e.key === "Escape") closeBox();
    if (e.key === "ArrowLeft") show(current + 1);
    if (e.key === "ArrowRight") show(current - 1);
  });
});
