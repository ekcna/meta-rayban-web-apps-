(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var navToggle = document.getElementById("navToggle");
  if (navToggle && header) {
    navToggle.addEventListener("click", function () {
      var isOpen = header.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    document.getElementById("mainNav").addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        header.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".main-nav a"));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = "#" + entry.target.id;
          navLinks.forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("href") === id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (section) { spy.observe(section); });
  }

  var videoFrame = document.getElementById("videoFrame");
  var playBtn = document.getElementById("playBtn");
  if (videoFrame && playBtn) {
    playBtn.addEventListener("click", function () {
      var videoId = videoFrame.getAttribute("data-video-id");
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube.com/embed/" + videoId + "?autoplay=1&rel=0";
      iframe.title = "Introducing Meta Ray-Ban Display AI Glasses";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      videoFrame.innerHTML = "";
      videoFrame.appendChild(iframe);
    });
  }

  var colorSwatches = document.querySelectorAll("#colorSwatches .swatch");
  var sizePills = document.querySelectorAll("#sizeOptions .pill");
  var preview = document.getElementById("glassesPreview");
  var previewLabel = document.getElementById("previewLabel");
  var state = { color: "Black", size: "Standard" };

  function updatePreviewLabel() {
    previewLabel.textContent = state.color + " · " + state.size;
  }

  colorSwatches.forEach(function (btn) {
    btn.addEventListener("click", function () {
      colorSwatches.forEach(function (b) { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      var hex = btn.getAttribute("data-hex");
      if (preview) preview.style.color = hex;
      state.color = btn.textContent.trim();
      updatePreviewLabel();
    });
  });

  sizePills.forEach(function (btn) {
    btn.addEventListener("click", function () {
      sizePills.forEach(function (b) { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      state.size = btn.getAttribute("data-size");
      updatePreviewLabel();
    });
  });

  var regionSelect = document.getElementById("regionSelect");
  var availabilityText = document.getElementById("availabilityText");
  var availabilityByRegion = {
    us: "In stock — ships now",
    ca: "In stock — ships now",
    uk: "In stock — ships now",
    fr: "Pre-order now — arrives October 13, 2026",
    it: "Pre-order now — arrives October 13, 2026",
    de: "Pre-order now — arrives October 13, 2026"
  };
  if (regionSelect && availabilityText) {
    regionSelect.addEventListener("change", function () {
      availabilityText.textContent = availabilityByRegion[regionSelect.value] || availabilityByRegion.us;
    });
  }

  document.querySelectorAll(".faq-question").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".faq-item");
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (openItem) {
        openItem.classList.remove("open");
        openItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
})();
