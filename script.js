// Casa Lago Ticino: navigation, gallery, prices and booking form
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Header: solid background after the hero ---------- */
  const header = $(".site-header");
  const hero = $(".hero");
  function updateHeader() {
    const limit = hero ? hero.offsetHeight - 90 : 10;
    header.classList.toggle("scrolled", window.scrollY > limit);
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);
  updateHeader();

  /* ---------- Mobile menu ---------- */
  const toggle = $("#nav-toggle");
  const nav = $("#main-nav");
  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    $(".sr-only", toggle).textContent = open ? "Menü schliessen" : "Menü öffnen";
    document.body.style.overflow = open ? "hidden" : "";
  }
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- Active link while scrolling ---------- */
  const links = $$(".main-nav a:not(.btn)");
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Scroll reveal (only for elements still below the fold) ---------- */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduceMotion) {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("pending");
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    $$(".reveal").forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("pending");
        reveal.observe(el);
      }
    });
  }

  /* ---------- Gallery lightbox ---------- */
  const items = $$(".g-item");
  const lightbox = $("#lightbox");
  const lbImg = $("#lb-img");
  const lbCap = $("#lb-cap");
  let current = 0;
  let lastFocus = null;

  function show(i) {
    current = (i + items.length) % items.length;
    const img = $("img", items[current]);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.alt + "  ·  " + (current + 1) + " / " + items.length;
  }
  function openLightbox(i) {
    lastFocus = document.activeElement;
    show(i);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    $("#lb-close").focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  items.forEach((btn, i) => btn.addEventListener("click", () => openLightbox(i)));
  $("#lb-close").addEventListener("click", closeLightbox);
  $("#lb-prev").addEventListener("click", () => show(current - 1));
  $("#lb-next").addEventListener("click", () => show(current + 1));
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  /* ---------- Seasons and prices ---------- */
  // Months are 0-based: 0 = January
  const SEASONS = {
    neben: { name: "Nebensaison", price: 350 },
    haupt: { name: "Hauptsaison", price: 450 },
    hoch: { name: "Hochsaison", price: 550 },
  };
  const MIN_NIGHTS = 3;
  function seasonOf(month) {
    if (month === 6 || month === 7) return "hoch";
    if ((month >= 3 && month <= 5) || month === 8 || month === 9) return "haupt";
    return "neben";
  }
  const nowSeason = seasonOf(new Date().getMonth());
  const currentCard = $('.price-card[data-season="' + nowSeason + '"]');
  if (currentCard) currentCard.classList.add("current");

  /* ---------- Booking form ---------- */
  const form = $("#booking-form");
  const arrival = $("#f-arrival");
  const departure = $("#f-departure");
  const estimate = $("#estimate");
  const errorBox = $("#form-error");
  const chf = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 });
  const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

  function isoToday(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parseISO(value) {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  arrival.min = isoToday(1);
  departure.min = isoToday(1 + MIN_NIGHTS);

  // Returns the price of a stay, night by night, so stays across two seasons are priced correctly
  function quote(from, to) {
    const nights = Math.round((to - from) / 86400000);
    const perSeason = {};
    let total = 0;
    for (let i = 0; i < nights; i++) {
      const night = new Date(from.getTime() + i * 86400000);
      const key = seasonOf(night.getUTCMonth());
      perSeason[key] = (perSeason[key] || 0) + 1;
      total += SEASONS[key].price;
    }
    return { nights, perSeason, total };
  }

  function updateEstimate() {
    estimate.classList.remove("warn");
    const from = parseISO(arrival.value);
    const to = parseISO(departure.value);
    if (from) {
      const minDep = new Date(from.getTime() + MIN_NIGHTS * 86400000).toISOString().slice(0, 10);
      departure.min = minDep;
    }
    if (!from || !to) {
      estimate.textContent = "Wählen Sie An- und Abreise, um den Preis zu sehen.";
      return null;
    }
    const q = quote(from, to);
    if (q.nights < 1) {
      estimate.classList.add("warn");
      estimate.textContent = "Die Abreise muss nach der Anreise liegen.";
      return null;
    }
    if (q.nights < MIN_NIGHTS) {
      estimate.classList.add("warn");
      estimate.textContent = "Der Mindestaufenthalt beträgt " + MIN_NIGHTS + " Nächte. Sie haben " + q.nights + " gewählt.";
      return null;
    }
    const parts = Object.keys(q.perSeason).map((k) => q.perSeason[k] + " × " + chf.format(SEASONS[k].price) + " (" + SEASONS[k].name + ")");
    estimate.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = q.nights + " Nächte: " + chf.format(q.total);
    estimate.append(strong, document.createElement("br"), parts.join(" + ") + ", Endreinigung inklusive");
    return q;
  }
  arrival.addEventListener("change", updateEstimate);
  departure.addEventListener("change", updateEstimate);

  function setInvalid(input, invalid) {
    input.closest(".field").classList.toggle("invalid", invalid);
    input.setAttribute("aria-invalid", String(invalid));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#f-name");
    const email = $("#f-email");
    const message = $("#f-message");
    const problems = [];

    setInvalid(name, !name.value.trim());
    if (!name.value.trim()) problems.push("Name");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    setInvalid(email, !emailOk);
    if (!emailOk) problems.push("gültige E-Mail-Adresse");
    setInvalid(message, !message.value.trim());
    if (!message.value.trim()) problems.push("Nachricht");

    const hasDates = arrival.value || departure.value;
    const q = updateEstimate();
    if (hasDates && !q) problems.push("gültige Reisedaten");

    if (problems.length) {
      errorBox.textContent = "Bitte ergänzen Sie: " + problems.join(", ") + ".";
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;

    let text = "Danke, " + name.value.trim().split(" ")[0] + ". Ihre Anfrage ist eingegangen.";
    if (q) {
      text += " Für den " + dateFmt.format(parseISO(arrival.value)) + " bis " + dateFmt.format(parseISO(departure.value)) +
        " prüfen wir die Verfügbarkeit (" + q.nights + " Nächte, " + chf.format(q.total) + ").";
    }
    text += " Wir antworten innert 24 Stunden an " + email.value.trim() + ".";
    $("#success-text").textContent = text;
    $("#form-fields").hidden = true;
    $("#form-success").hidden = false;
  });

  $("#form-reset").addEventListener("click", () => {
    form.reset();
    updateEstimate();
    $$(".field.invalid", form).forEach((f) => f.classList.remove("invalid"));
    $("#form-success").hidden = true;
    $("#form-fields").hidden = false;
    $("#f-name").focus();
  });

  /* ---------- "Verfügbarkeit prüfen" jumps straight to the arrival date ---------- */
  $$('.prices-section a[href="#kontakt"]').forEach((a) =>
    a.addEventListener("click", () => setTimeout(() => arrival.focus({ preventScroll: true }), 600))
  );

  $("#year").textContent = new Date().getFullYear();
})();
