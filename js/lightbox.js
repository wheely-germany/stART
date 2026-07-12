/* =========================================================
   LIGHTBOX.JS – Vollbild-Ansicht der Galerie
   ========================================================= */

(() => {
  const lightbox  = document.getElementById("lightbox");
  if (!lightbox) return;

  const image     = lightbox.querySelector(".lightbox__image");
  const titleEl   = lightbox.querySelector(".lightbox__title");
  const detailsEl = lightbox.querySelector(".lightbox__details");
  const counterEl = lightbox.querySelector(".lightbox__counter");
  const btnClose  = lightbox.querySelector(".lightbox__close");
  const btnPrev   = lightbox.querySelector(".lightbox__prev");
  const btnNext   = lightbox.querySelector(".lightbox__next");
  const body      = document.body;

  let items = [];
  let currentIndex = 0;

  /* ---------- Meta-HTML aus dataset bauen ---------- */
const buildDetails = (data) => {
  // Werte pro Gruppe sammeln, leere überspringen
  const join = (arr) => arr.filter(v => v && v.length).join(" · ");

  const line1 = join([data.date, data.location]);
  const line2 = join([data.camera, data.lens]);
  const line3 = join([data.aperture, data.shutter, data.iso]);

  return [line1, line2, line3]
    .filter(l => l.length)
    .map(l => `<p class="lightbox__detail-line">${l}</p>`)
    .join("");
};

  /* ---------- Bild anzeigen ---------- */
  const showImage = (index) => {
    const item = items[index];
    if (!item) return;

    image.classList.add("is-loading");

    const src = item.dataset.src || item.querySelector("img")?.src;
    const data = item.dataset;

    // Preload für sanfteres Anzeigen
    const preload = new Image();
    preload.onload = () => {
      image.src = src;
      image.alt = data.title || "";
      image.classList.remove("is-loading");
    };
    preload.src = src;

    titleEl.textContent = data.title || "";
    
    // NEU: Subtitle unter Titel
    const subtitleEl = lightbox.querySelector(".lightbox__subtitle");
    if (subtitleEl) {
      subtitleEl.textContent = data.subtitle || "";
      subtitleEl.style.display = data.subtitle ? "" : "none";
    }


    detailsEl.innerHTML = buildDetails(data);
    counterEl.textContent = `${index + 1} / ${items.length}`;
  };

  /* ---------- Öffnen ---------- */
  const openLightbox = (index) => {
    items = Array.from(document.querySelectorAll(".gallery__item"));
    if (!items.length) return;

    currentIndex = index;
    lightbox.hidden = false;
    // Nächster Frame, damit Transition greift
    requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
    });
    body.classList.add("is-lightbox-open");
    showImage(currentIndex);
    btnClose.focus();
  };

  /* ---------- Schließen ---------- */
  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    body.classList.remove("is-lightbox-open");
    // Nach Transition ausblenden
    setTimeout(() => {
      lightbox.hidden = true;
      image.src = "";
    }, 400);
  };

  /* ---------- Navigation ---------- */
  const next = () => {
    currentIndex = (currentIndex + 1) % items.length;
    showImage(currentIndex);
  };

  const prev = () => {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    showImage(currentIndex);
  };

  /* ---------- Event: Galerie öffnet Lightbox ---------- */
  document.addEventListener("gallery:open", (e) => {
    const clickedItem = e.detail.item;
    const all = Array.from(document.querySelectorAll(".gallery__item"));
    const idx = all.indexOf(clickedItem);
    if (idx >= 0) openLightbox(idx);
  });

  /* ---------- Buttons ---------- */
  btnClose.addEventListener("click", closeLightbox);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);

  /* ---------- Klick außerhalb schließt ---------- */
  lightbox.addEventListener("click", (e) => {
    // Nur wenn direkt auf Overlay (nicht auf Inhalte) geklickt
    if (e.target === lightbox) closeLightbox();
  });

  /* ---------- Tastatur ---------- */
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    switch (e.key) {
      case "Escape":     closeLightbox(); break;
      case "ArrowLeft":  prev();          break;
      case "ArrowRight": next();          break;
    }
  });

  /* ---------- Touch: Wisch-Gesten ---------- */
  let touchStartX = 0;
  let touchEndX   = 0;
  const SWIPE_THRESHOLD = 50;

  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) prev();
    else          next();
  }, { passive: true });
})();
