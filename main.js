/* ============================================================
   Brent Hogarth — Thinking Productively landing page
   Interaction layer: email capture, mobile nav, scroll reveal.
   No build step, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Email capture --------------------------------------
     Validates, shows the success state, and echoes the address.
     Wire to your ESP (e.g. Kit / ConvertKit) where marked below. */
  document.querySelectorAll("[data-email-form]").forEach(function (wrap) {
    var form = wrap.querySelector("form");
    var input = wrap.querySelector(".email-form__input");
    var echo = wrap.querySelector("[data-email-echo]");
    if (!form || !input) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = input.value.trim();
      // Minimal client-side check; rely on the server/ESP for real validation.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.focus();
        input.setCustomValidity("Enter a valid email address");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");

      // === Connect your email provider here ===
      // e.g. fetch("https://app.kit.com/forms/<id>/subscribe", { method: "POST", ... })
      //   .then(show).catch(showError);
      // For now we optimistically show the success state.

      if (echo) echo.textContent = email;
      wrap.classList.add("is-done");
    });

    input.addEventListener("input", function () { input.setCustomValidity(""); });
  });

  /* ---- Mobile nav ----------------------------------------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var links = document.querySelector("[data-nav-links]");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close after tapping a link.
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Scroll reveal (calm, slow rise) -------------------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      // Cascade: elements that enter together reveal top-to-bottom in sequence
      // (eyebrow → headline → body), each offset by a small delay.
      var entering = entries.filter(function (e) { return e.isIntersecting; });
      entering.sort(function (a, b) {
        return a.boundingClientRect.top - b.boundingClientRect.top;
      });
      entering.forEach(function (entry, i) {
        entry.target.style.setProperty("--reveal-delay", (i * 75) + "ms");
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }
})();
