/* =========================================================
   MAIN.JS – Header-Scroll & Burger-Menü & Reveal
   ========================================================= */

(() => {
  const header     = document.getElementById("siteHeader");
  const menuToggle = document.getElementById("menuToggle");
  const nav        = document.getElementById("siteNav");
  const navLinks   = nav.querySelectorAll("a");
  const body       = document.body;

  /* ---------- 1. Header: transparent → dunkel beim Scrollen ---------- */
  const SCROLL_THRESHOLD = 40;

  const onScroll = () => {
    if (window.scrollY > SCROLL_THRESHOLD) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // initial ausführen

  /* ---------- 2. Burger-Menü öffnen/schließen ---------- */
  const toggleMenu = (forceClose = false) => {
    const willOpen = forceClose ? false : !nav.classList.contains("is-open");

    nav.classList.toggle("is-open", willOpen);
    menuToggle.classList.toggle("is-active", willOpen);
    body.classList.toggle("is-menu-open", willOpen);
    menuToggle.setAttribute("aria-expanded", willOpen);
    menuToggle.setAttribute(
      "aria-label",
      willOpen ? "Menü schließen" : "Menü öffnen"
    );
  };

  menuToggle.addEventListener("click", () => toggleMenu());

  /* ---------- 3. Menü schließen beim Klick auf Link ---------- */
  navLinks.forEach((link) =>
    link.addEventListener("click", () => toggleMenu(true))
  );

  /* ---------- 4. Menü schließen mit ESC-Taste ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      toggleMenu(true);
    }
  });

  /* ---------- 5. Scroll-Reveal via Intersection Observer ---------- */
  const revealElements = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window && revealElements.length) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add("is-visible"));
  }
})();