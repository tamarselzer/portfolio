const app = document.getElementById("app");
const CACHE_BUST = Date.now();
let suppressTopEffect = false;
let refreshScrollEffects = () => {};
let updateScrollEffects = () => {};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

const lightbox = el("div", { class: "lightbox" });
const lightboxStage = el("div", { class: "lightbox-stage" });
const lightboxTrack = el("div", { class: "lightbox-track" });
lightboxStage.appendChild(lightboxTrack);
const lightboxClose = el("button", { type: "button", class: "lightbox-close", "aria-label": "Close" }, "×");
const lightboxPrev = el("button", { type: "button", class: "lightbox-arrow prev", "aria-label": "Previous" }, "‹");
const lightboxNext = el("button", { type: "button", class: "lightbox-arrow next", "aria-label": "Next" }, "›");
lightbox.appendChild(lightboxClose);
lightbox.appendChild(lightboxPrev);
lightbox.appendChild(lightboxStage);
lightbox.appendChild(lightboxNext);
document.body.appendChild(lightbox);

let lbItems = [];
let lbIdx = 0;
let lbAssetDir = "";
let lbAnimating = false;

function lbMakeSlide(item) {
  const src = `assets/${lbAssetDir}/${item.file}?v=${CACHE_BUST}`;
  const slide = el("div", { class: "lightbox-slide" });
  if (item.kind === "video") {
    const video = el("video", { src, controls: "", playsinline: "", autoplay: "" });
    if (item.rotate) video.style.transform = `rotate(${item.rotate}deg)`;
    slide.appendChild(video);
  } else {
    const img = el("img", { src, alt: "" });
    if (item.rotate) img.style.transform = `rotate(${item.rotate}deg)`;
    slide.appendChild(img);
  }
  return slide;
}

function lbDraw() {
  lightboxTrack.innerHTML = "";
  lightboxTrack.appendChild(lbMakeSlide(lbItems[lbIdx]));
  const multi = lbItems.length > 1;
  lightboxPrev.style.display = multi ? "" : "none";
  lightboxNext.style.display = multi ? "" : "none";
}

function lbGoTo(newIdx, dir) {
  if (lbAnimating || lbItems.length <= 1) return;
  lbAnimating = true;
  const current = lightboxTrack.querySelector(".lightbox-slide");
  const nextSlide = lbMakeSlide(lbItems[newIdx]);
  nextSlide.style.transform = `translateX(${dir * 100}%)`;
  lightboxTrack.appendChild(nextSlide);
  nextSlide.getBoundingClientRect();
  requestAnimationFrame(() => {
    current.style.transition = "transform 0.45s ease";
    nextSlide.style.transition = "transform 0.45s ease";
    current.style.transform = `translateX(${-dir * 100}%)`;
    nextSlide.style.transform = "translateX(0%)";
  });
  nextSlide.addEventListener(
    "transitionend",
    () => {
      current.remove();
      lbAnimating = false;
    },
    { once: true }
  );
  lbIdx = newIdx;
}

function openLightbox(items, startIdx, assetDir) {
  lbItems = items;
  lbIdx = startIdx;
  lbAssetDir = assetDir;
  lbDraw();
  lightbox.classList.add("open");
  document.body.appendChild(lightbox);
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightboxTrack.innerHTML = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
lightboxPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  lbGoTo((lbIdx - 1 + lbItems.length) % lbItems.length, -1);
});
lightboxNext.addEventListener("click", (e) => {
  e.stopPropagation();
  lbGoTo((lbIdx + 1) % lbItems.length, 1);
});
document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") lightboxPrev.click();
  if (e.key === "ArrowRight") lightboxNext.click();
});

async function loadData() {
  const [siteRes, projectsRes] = await Promise.all([
    fetch("content/site.json", { cache: "no-store" }),
    fetch("content/projects.json", { cache: "no-store" }),
  ]);
  return { site: await siteRes.json(), projects: await projectsRes.json() };
}

function renderEntryGroup(heading, entries) {
  const group = el("div", { class: "experience-block" });
  group.appendChild(el("div", { class: "heading bold" }, heading));
  const lines = el("div", { class: "lines" });
  for (const entry of entries || []) {
    lines.appendChild(
      el("div", { class: "entry" }, [
        el("div", { class: "entry-date" }, entry.date),
        el("div", { class: "entry-text" }, entry.text),
      ])
    );
  }
  group.appendChild(lines);
  return group;
}

function renderCoverList(projects) {
  const list = el("div", { class: "cover-list" });

  for (const project of projects) {
    if (!project.sidebarCover) continue;
    const src = `assets/sidebar/${project.sidebarCover}?v=${CACHE_BUST}`;
    const row = el("div", { class: "cover-item", "data-slug": project.slug });
    const img = el("img", { src, alt: project.title, loading: "lazy" });
    row.appendChild(img);
    row.appendChild(el("span", { class: "cover-number" }, `[ ${parseInt(project.number, 10)} ]`));
    row.addEventListener("click", () => {
      suppressTopEffect = true;
      updateScrollEffects();
      document.getElementById(project.slug).scrollIntoView({ behavior: "smooth" });
    });
    list.appendChild(row);
  }

  return list;
}

function renderSidebar(site, projects) {
  const aside = el("aside", { class: "sidebar" });

  const top = el("div", { class: "top-group" });

  const aboutContent = el("div", { class: "about-content" });
  const aboutColLeft = el("div", { class: "about-col-left" });
  aboutColLeft.appendChild(el("p", { class: "bio" }, site.bio));
  const aboutColRight = el("div", { class: "about-col-right" });
  aboutColRight.appendChild(renderEntryGroup("Experience", site.experience));
  aboutColRight.appendChild(renderEntryGroup("Education", site.education));
  if (site.cv && site.cv.url) {
    aboutColRight.appendChild(el("div", { class: "cv" }, el("a", { href: site.cv.url }, site.cv.label || "download full cv")));
  }
  if (site.email) {
    aboutColRight.appendChild(
      el("div", { class: "about-email" }, el("a", { href: `mailto:${site.email}` }, site.email))
    );
  }
  const instagram = (site.social || []).find((s) => s.label === "instagram" && s.url);
  if (instagram) {
    aboutColRight.appendChild(
      el("div", { class: "about-email" }, el("a", { href: instagram.url, target: "_blank", rel: "noopener" }, "instagram"))
    );
  }
  aboutContent.appendChild(aboutColLeft);
  aboutContent.appendChild(aboutColRight);
  const aboutOverlay = el("div", { class: "about-overlay" }, aboutContent);
  document.body.appendChild(aboutOverlay);

  const aboutTab = el("button", { type: "button", class: "tab-btn about-tab-fixed" }, "[ About ]");
  aboutTab.addEventListener("click", () => {
    const open = aboutOverlay.classList.toggle("open");
    aboutTab.classList.toggle("active", open);
  });
  aboutOverlay.addEventListener("click", (e) => {
    if (e.target === aboutOverlay) {
      aboutOverlay.classList.remove("open");
      aboutTab.classList.remove("active");
    }
  });
  document.body.appendChild(aboutTab);

  if (site.name) {
    const siteName = el("div", { class: "site-name site-name-fixed" }, site.name);
    siteName.addEventListener("click", () => {
      suppressTopEffect = false;
      refreshScrollEffects();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.body.appendChild(siteName);
  }

  top.appendChild(renderCoverList(projects));
  aside.appendChild(top);

  return aside;
}

function renderContactBar(site) {
  const bar = el("div", { class: "contact-bar" });
  bar.appendChild(el("span", {}, "contact:"));
  if (site.email) {
    bar.appendChild(el("a", { href: `mailto:${site.email}` }, "email"));
  }
  for (const s of site.social || []) {
    if (s.url) bar.appendChild(el("a", { href: s.url }, s.label));
  }
  return bar;
}

function renderCreditLines(lines) {
  const wrap = el("div", { class: "credits-block" });
  for (const c of lines || []) {
    wrap.appendChild(
      el("div", { class: "credit-line" }, [
        c.label ? el("span", { class: "label" }, `${c.label}: `) : null,
        el("span", { class: "value" }, c.text),
      ])
    );
  }
  return wrap;
}

function renderGalleryGrid(project) {
  const gallery = el("div", { class: "gallery gallery-grid" });
  project.items.forEach((item, i) => {
    const src = `assets/${project.assetDir}/${item.file}?v=${CACHE_BUST}`;
    const cell = el("div", { class: "grid-cell" });
    if (item.kind === "video") {
      cell.appendChild(el("video", { src, controls: "", playsinline: "", preload: "metadata" }));
    } else {
      const img = el("img", { src, alt: project.title, loading: "lazy" });
      img.addEventListener("click", () => openLightbox(project.items, i, project.assetDir));
      cell.appendChild(img);
    }
    gallery.appendChild(cell);
  });
  return gallery;
}

function renderGallery(project, tickerEl) {
  if (project.galleryLayout === "grid") return renderGalleryGrid(project);

  const gallery = el("div", { class: "gallery" });
  const stage = el("div", { class: "stage" });
  if (project.stageBg) stage.style.background = project.stageBg;
  const track = el("div", { class: "track" });
  stage.appendChild(track);
  gallery.appendChild(stage);

  const counter = el("div", { class: "counter" }, "");
  const bottomRow = el("div", { class: "gallery-bottom-row" }, tickerEl ? [counter, tickerEl] : [counter]);
  gallery.appendChild(bottomRow);

  const prevBtn = el("button", { type: "button", class: "arrow-btn prev", "aria-label": "Previous" }, "‹");
  const nextBtn = el("button", { type: "button", class: "arrow-btn next", "aria-label": "Next" }, "›");

  const items = project.items;
  const itemByFile = new Map(items.map((it, i) => [it.file, { item: it, flatIndex: i }]));

  // Normalize into a list of slides; each slide has one or more files.
  const slides = project.slides
    ? project.slides.map((s) => ({
        layout: s.layout || "single",
        inset: !!s.inset,
        entries: s.files.map((f) => itemByFile.get(f)).filter(Boolean),
      }))
    : items.map((it, i) => ({ layout: "single", inset: !!it.inset, entries: [{ item: it, flatIndex: i }] }));

  let idx = 0;
  let animating = false;

  function makeMedia(entry) {
    const { item, flatIndex } = entry;
    const src = `assets/${project.assetDir}/${item.file}?v=${CACHE_BUST}`;
    if (item.kind === "video") {
      const video = item.gif
        ? el("video", { src, autoplay: "", loop: "", muted: "", playsinline: "", preload: "auto" })
        : el("video", { src, controls: "", playsinline: "", preload: "metadata" });
      if (item.gif) video.muted = true;
      if (item.rotate) video.style.transform = `rotate(${item.rotate}deg)`;
      return video;
    }
    const img = el("img", { src, alt: project.title, loading: "lazy" });
    if (item.rotate) img.style.transform = `rotate(${item.rotate}deg)`;
    img.addEventListener("click", () => openLightbox(items, flatIndex, project.assetDir));
    return img;
  }

  function makeSlide(slideDef) {
    const slide = el("div", { class: `slide${slideDef.inset && slideDef.entries.length <= 1 ? " inset" : ""}` });
    if (slideDef.entries.length > 1) {
      const group = el("div", { class: `slide-group ${slideDef.layout}${slideDef.inset ? " inset" : ""}` });
      for (const entry of slideDef.entries) {
        group.appendChild(makeMedia(entry));
      }
      slide.appendChild(group);
    } else {
      slide.appendChild(makeMedia(slideDef.entries[0]));
    }
    return slide;
  }

  function updateCounter() {
    counter.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  }

  function drawInitial() {
    track.innerHTML = "";
    track.appendChild(makeSlide(slides[idx]));
    updateCounter();
  }

  function goTo(newIdx, dir) {
    if (animating) return;
    animating = true;
    const current = track.querySelector(".slide");
    const nextSlide = makeSlide(slides[newIdx]);
    nextSlide.style.transform = `translateX(${dir * 100}%)`;
    track.appendChild(nextSlide);
    nextSlide.getBoundingClientRect();
    requestAnimationFrame(() => {
      current.style.transition = "transform 0.45s ease";
      nextSlide.style.transition = "transform 0.45s ease";
      current.style.transform = `translateX(${-dir * 100}%)`;
      nextSlide.style.transform = "translateX(0%)";
    });
    nextSlide.addEventListener(
      "transitionend",
      () => {
        current.remove();
        animating = false;
      },
      { once: true }
    );
    idx = newIdx;
    updateCounter();
  }

  prevBtn.addEventListener("click", () => goTo((idx - 1 + slides.length) % slides.length, -1));
  nextBtn.addEventListener("click", () => goTo((idx + 1) % slides.length, 1));

  if (slides.length > 1) {
    gallery.appendChild(prevBtn);
    gallery.appendChild(nextBtn);
  }

  // The first slide's media dictates the stage's aspect ratio (and therefore its height,
  // since the stage always fills the available width).
  const firstEntry = slides[0].entries[0];
  const firstSrc = `assets/${project.assetDir}/${firstEntry.item.file}?v=${CACHE_BUST}`;
  if (firstEntry.item.kind === "video") {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => {
      if (probe.videoWidth && probe.videoHeight) {
        stage.style.aspectRatio = `${probe.videoWidth} / ${probe.videoHeight}`;
      }
    });
    probe.src = firstSrc;
  } else {
    const probe = new Image();
    probe.addEventListener("load", () => {
      stage.style.aspectRatio = `${probe.naturalWidth} / ${probe.naturalHeight}`;
    });
    probe.src = firstSrc;
  }

  drawInitial();
  return gallery;
}

function renderTicker(project) {
  const ticker = project.ticker;
  if (!ticker || (!ticker.label && (!ticker.tags || !ticker.tags.length))) return null;

  const bar = el("div", { class: "gallery-ticker" });
  if (ticker.label) bar.appendChild(el("span", { class: "ticker-label" }, ticker.label));

  if (ticker.tags && ticker.tags.length) {
    const scroll = el("div", { class: "ticker-scroll" });
    const text = ticker.tags.join(", ") + ", ";
    const repeats = 6;
    const track = el("div", { class: "ticker-track" }, [el("span", {}, text.repeat(repeats))]);
    scroll.appendChild(track);
    bar.appendChild(scroll);
  }

  return bar;
}

function renderProject(project) {
  const section = el("section", { class: "project", id: project.slug });

  const info = el("div", { class: "info" });
  info.appendChild(el("div", { class: "title" }, `[ ${parseInt(project.number, 10)} ] ${project.title}`));

  const metaLines = el("div", { class: "meta-lines" });
  for (const line of project.metaLines || []) {
    if (project.link && line === project.link.matchLine) {
      metaLines.appendChild(el("div", {}, el("a", { href: project.link.url }, project.link.label)));
    } else {
      metaLines.appendChild(el("div", {}, line));
    }
  }
  info.appendChild(metaLines);

  info.appendChild(renderCreditLines(project.creditsBefore));

  const desc = el("div", { class: "description" });
  for (const p of project.description || []) {
    desc.appendChild(el("p", {}, p));
  }
  info.appendChild(desc);

  info.appendChild(renderCreditLines(project.creditsAfter));

  if (project.year) info.appendChild(el("div", { class: "year" }, project.year));

  const galleryCol = el("div", { class: "gallery-col" });
  const ticker = renderTicker(project);
  if (project.galleryLayout === "grid") {
    galleryCol.appendChild(renderGallery(project));
    if (ticker) galleryCol.appendChild(ticker);
  } else {
    galleryCol.appendChild(renderGallery(project, ticker));
  }

  section.appendChild(info);
  section.appendChild(galleryCol);
  return section;
}

function initScrollEffects(projects) {
  const mainOverlay = el("div", { class: "main-top-overlay" });
  document.body.appendChild(mainOverlay);

  const coverItems = [...document.querySelectorAll(".cover-item")];
  let ticking = false;
  let forceHome = false;

  function update(instant) {
    ticking = false;
    const atTop = forceHome || (window.scrollY <= 2 && !suppressTopEffect);

    if (instant) {
      mainOverlay.style.transition = "none";
      for (const item of coverItems) item.style.transition = "none";
      void mainOverlay.offsetWidth;
    }

    mainOverlay.classList.toggle("visible", atTop);

    if (atTop) {
      for (const item of coverItems) item.classList.remove("dimmed");
    } else {
      const mid = window.innerHeight / 2;
      let current = null;
      for (const project of projects) {
        const section = document.getElementById(project.slug);
        if (!section) continue;
        const rect = section.getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= mid) {
          current = project.slug;
          break;
        }
      }
      for (const item of coverItems) {
        item.classList.toggle("dimmed", item.dataset.slug !== current);
      }
    }

    if (instant) {
      void mainOverlay.offsetWidth;
      requestAnimationFrame(() => {
        mainOverlay.style.transition = "";
        for (const item of coverItems) item.style.transition = "";
      });
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  function waitForScrollSettle(cb) {
    let lastY = window.scrollY;
    let stableFrames = 0;
    function check() {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 0.5) {
        stableFrames++;
      } else {
        stableFrames = 0;
      }
      lastY = y;
      if (stableFrames >= 4) {
        cb();
      } else {
        requestAnimationFrame(check);
      }
    }
    requestAnimationFrame(check);
  }

  refreshScrollEffects = () => {
    forceHome = true;
    update(true);
    waitForScrollSettle(() => {
      forceHome = false;
      update();
    });
  };
  updateScrollEffects = update;
  update();
}

async function init() {
  const { site, projects } = await loadData();
  app.innerHTML = "";
  app.appendChild(renderSidebar(site, projects));
  app.appendChild(renderContactBar(site));
  const main = el("main", { class: "main" });
  for (const p of projects) {
    main.appendChild(renderProject(p));
  }
  app.appendChild(main);
  initScrollEffects(projects);
}

init();
