/* =========================================================
   GALLERY.JS – XMP-Parser für Titel UND Ort (AVIF-tauglich)
   ========================================================= */
(async () => {
  const grid = document.getElementById("galleryGrid");
  if (!grid) { console.warn("Gallery: #galleryGrid nicht gefunden"); return; }
  const GALLERY_PATH = "galerie/Bilder/";
  const MANIFEST_URL = "galerie/manifest.json";

  const formatDate = (d) => { if (!d) return null; const x = new Date(d); if (isNaN(x)) return null; return x.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" }); };
  const formatExposure = (t) => { if (!t) return null; if (t >= 1) return t + "s"; return "1/" + Math.round(1 / t) + "s"; };
  const formatFNumber = (f) => (f ? "f/" + f : null);
  const formatISO = (iso) => (iso ? "ISO " + iso : null);
  const escapeHtml = (str) => { const d = document.createElement("div"); d.textContent = String(str); return d.innerHTML; };
  const clean = (s) => { if (!s) return null; const t = String(s).trim(); return t.length ? t : null; };

  /* ---- XMP-Parser: liest Titel UND Ort direkt aus Datei-Bytes ---- */
  const xmpCache = {};
  const readXmpFromFile = async (src) => {
    if (src in xmpCache) return xmpCache[src];
    let result = { title: null, location: null };
    try {
      const res = await fetch(src);
      const buf = await res.arrayBuffer();
      const text = new TextDecoder("utf-8").decode(new Uint8Array(buf));

      const decode = (s) => s
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

      // Titel (dc:title)
      let mt = text.match(/<dc:title>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/);
      if (!mt) mt = text.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
      if (!mt) mt = text.match(/<photoshop:Headline>([^<]+)<\/photoshop:Headline>/);
      if (mt && mt[1]) { const t = decode(mt[1]); if (t.length) result.title = t; }

      // Ort (mehrere Felder probieren, Element- und Attribut-Form)
      const fields = ["photoshop:City", "Iptc4xmpCore:Location"]; //, "photoshop:State", "photoshop:Country"
      const parts = [];
      for (const field of fields) {
        let m = text.match(new RegExp("<" + field + ">([^<]+)</" + field + ">"));
        if (!m) m = text.match(new RegExp(field + '="([^"]+)"'));
        if (m && m[1]) {
          const v = decode(m[1]);
          if (v.length && !parts.includes(v)) parts.push(v);
        }
      }
      if (parts.length) result.location = parts.join(", ");
    } catch (e) { /* still */ }
    xmpCache[src] = result;
    return result;
  };

  const showSkeletons = (n = 6) => { for (let i = 0; i < n; i++) { const s = document.createElement("div"); s.className = "gallery__skeleton"; grid.appendChild(s); } };
  const clearSkeletons = () => grid.querySelectorAll(".gallery__skeleton").forEach(s => s.remove());
  showSkeletons();

  let manifest;
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error("Status " + res.status);
    manifest = await res.json();
  } catch (err) {
    console.error("Gallery: Manifest konnte nicht geladen werden", err);
    clearSkeletons();
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">Galerie konnte nicht geladen werden.</p>';
    return;
  }
  clearSkeletons();
  if (!manifest.images || !manifest.images.length) { grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Noch keine Bilder in der Galerie.</p>'; return; }

  const entries = manifest.images.map(e => {
    if (typeof e === "string") return { file: e, categories: [], title: null };
    return { file: e.file, categories: Array.isArray(e.categories) ? e.categories : [], title: e.title || null };
  });

  const buildItem = async ({ file: filename, categories, title: manifestTitle }) => {
    const src = GALLERY_PATH + filename.split("/").map(encodeURIComponent).join("/");
    const item = document.createElement("figure");
    item.className = "gallery__item";
    item.setAttribute("tabindex", "0");
    item.dataset.src = src;
    item.dataset.filename = filename;
    item.dataset.categories = categories.join(",");

    const img = document.createElement("img");
    img.src = src; img.alt = filename; img.loading = "lazy"; img.decoding = "async";
    const overlay = document.createElement("figcaption");
    overlay.className = "gallery__overlay";
    item.appendChild(img); item.appendChild(overlay); grid.appendChild(item);

    const name = filename.split("/").pop().replace(/\.[^.]+$/, "").replace(/_(\d)/g, " #$1"); //Bildname + Zahl
    const renderOverlay = (sub) => {
      const subHtml = (sub && sub.length) ? '<p class="gallery__subtitle">' + escapeHtml(sub) + '</p>' : '';
      overlay.innerHTML = '<h3 class="gallery__title">' + escapeHtml(name) + '</h3>' + subHtml;
    };

    let subtitle = clean(manifestTitle);
    renderOverlay(subtitle);
    item.dataset.title = name;
    item.dataset.subtitle = subtitle || "";

    img.addEventListener("load", () => item.classList.add("is-loaded"), { once: true });
    img.addEventListener("error", () => { console.warn("Bild nicht gefunden: " + filename); item.remove(); });

    // EXIF-Meta via exifr
    try {
      if (typeof exifr !== "undefined") {
        const exif = await exifr.parse(src, { tiff:true, exif:true, iptc:true, xmp:true, icc:false, translateKeys:true, translateValues:true, reviveValues:true, sanitize:true, mergeOutput:true });
        if (exif) {
          if (!subtitle) {
            const ex = exif.title || exif.XPTitle || exif.ObjectName || exif.Headline || exif.ImageDescription || exif.Caption || exif["Caption-Abstract"] || exif.description || (exif.dc && exif.dc.title);
            const exTitle = clean(typeof ex === "object" ? (ex["x-default"] || Object.values(ex)[0]) : ex);
            if (exTitle) { subtitle = exTitle; renderOverlay(subtitle); item.dataset.subtitle = subtitle; }
          }
          item.dataset.camera = clean(exif.Model) || "";
          item.dataset.lens = clean(exif.LensModel) || "";
          item.dataset.date = formatDate(exif.DateTimeOriginal || exif.CreateDate) || "";
          item.dataset.aperture = formatFNumber(exif.FNumber) || "";
          item.dataset.shutter = formatExposure(exif.ExposureTime) || "";
          item.dataset.iso = formatISO(exif.ISO || exif.ISOSpeedRatings) || "";
          item.dataset.location = clean(exif.City) || clean(exif.Location) || clean(exif.State) || "";
        }
      }
    } catch (err) { /* kein exif */ }

    // Titel und/oder Ort per XMP-Parser nachladen (rettet AVIF)
    if (!subtitle || !item.dataset.location) {
      const xmp = await readXmpFromFile(src);
      if (!subtitle && xmp.title) {
        subtitle = xmp.title;
        renderOverlay(subtitle);
        item.dataset.subtitle = subtitle;
      }
      if (!item.dataset.location && xmp.location) {
        item.dataset.location = xmp.location;
      }
    }
  };

  await Promise.all(entries.map(buildItem));

  const allCats = new Set();
  entries.forEach(e => e.categories.forEach(c => allCats.add(c)));
  if (allCats.size > 0) {
    const header = document.querySelector(".gallery__header");
    const filters = document.createElement("div");
    filters.className = "gallery__filters";
    const mk = (label, value, act=false) => { const b = document.createElement("button"); b.className = "gallery__filter-btn" + (act ? " is-active" : ""); b.textContent = label; b.dataset.filter = value; return b; };
    filters.appendChild(mk("Alle", "all", true));
    Array.from(allCats).sort().forEach(c => filters.appendChild(mk(c.charAt(0).toUpperCase() + c.slice(1), c)));
    if (header) header.appendChild(filters);
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest(".gallery__filter-btn");
      if (!btn) return;
      const f = btn.dataset.filter;
      filters.querySelectorAll(".gallery__filter-btn").forEach(b => b.classList.toggle("is-active", b === btn));
      grid.querySelectorAll(".gallery__item").forEach(item => {
        const cats = (item.dataset.categories || "").split(",");
        item.classList.toggle("is-hidden", !(f === "all" || cats.includes(f)));
      });
    });
  }

  grid.addEventListener("click", (e) => {
    const item = e.target.closest(".gallery__item");
    if (!item || item.classList.contains("is-hidden")) return;
    document.dispatchEvent(new CustomEvent("gallery:open", { detail: { item } }));
  });
})();