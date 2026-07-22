/* ============================================================
   LUMINA LOGGER — FRONTEND SCRIPT
   Paste this entire <script> block just before the closing
   </body> tag on every HTML page where you want logging active.

   What it does:
   1. Fetches config.json (from your separate GitHub repo) to get
      the current backend URL and whether logging is enabled.
   2. If logging is enabled and a backend URL is present, it sends
      a "page_view" event immediately, then tracks behavior events
      (clicks, scrolls, focus/blur, forms, time on page) and sends
      them to your Flask backend.
   3. If the backend is unreachable (tunnel/laptop off), every send
      fails silently — it will NOT throw errors into your console
      that break the page, and it will NOT retry aggressively.

   Replace CONFIG_URL below with your real, working config.json URL.
   It must return raw JSON when opened directly in a browser.
   ============================================================ */

// <script>
(function () {
  "use strict";

  // ---- 1. SETTINGS YOU MUST EDIT ----
  const CONFIG_URL = "https://serveshkumarlal.github.io/Config/config.json"; 
  // ^ Replace with your ACTUAL working URL if different.
  // It must show raw JSON when opened directly in a browser tab.
  // If GitHub Pages is not enabled on that repo, use instead:
  // "https://raw.githubusercontent.com/ServeshKumarLal/Config/main/config.json"

  const CONFIG_CACHE_MS = 15000; // re-fetch config at most every 15s per page load (cheap safeguard)

  // ---- 2. INTERNAL STATE ----
  let CFG = null;
  let backendUrl = null;
  let loggingEnabled = false;
  let logEndpointPath = "/log";

  const sessionId = getOrCreateSessionId();
  const pageLoadTime = Date.now();
  let firstInteractionSent = false;
  let maxScrollDepth = 0;
  let lastScrollDirection = null;
  let lastScrollY = window.scrollY || 0;

  // ---- 3. SESSION ID (first-party only, localStorage + cookie fallback) ----
  function getOrCreateSessionId() {
    try {
      let sid = localStorage.getItem("lumina_session_id");
      if (!sid) {
        sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("lumina_session_id", sid);
      }
      return sid;
    } catch (e) {
      // localStorage blocked (privacy mode, etc.) — fall back to a per-page-load id
      return "sess_nofallback_" + Math.random().toString(36).slice(2);
    }
  }

  function getVisitCount() {
    try {
      let count = parseInt(localStorage.getItem("lumina_visit_count") || "0", 10);
      count += 1;
      localStorage.setItem("lumina_visit_count", String(count));
      return count;
    } catch (e) {
      return null;
    }
  }

  // ---- 4. FETCH CONFIG ----
  function loadConfig() {
    return fetch(CONFIG_URL, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Config fetch failed: " + res.status);
        return res.json();
      })
      .then((json) => {
        CFG = json;
        backendUrl = (json.backendUrl || "").replace(/\/+$/, ""); // strip trailing slash
        loggingEnabled = Boolean(json.loggingEnabled) && Boolean(backendUrl);
        logEndpointPath = json.logEndpoint || "/log";
        return CFG;
      })
      .catch((err) => {
        // Fail silently for the visitor experience, but keep one console warning for you (the dev)
        console.warn("[LuminaLogger] Could not load config.json:", err.message);
        loggingEnabled = false;
        return null;
      });
  }

  // ---- 5. CORE SEND FUNCTION (fails silently, never blocks the page) ----
  function sendEvent(eventType, data) {
    if (!loggingEnabled || !backendUrl) return; // backend/tunnel off, or logging disabled -> do nothing

    const payload = Object.assign(
      {
        eventType: eventType,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        pagePath: window.location.pathname,
        referrer: document.referrer || null,
      },
      data || {}
    );

    const url = backendUrl + logEndpointPath;

    // Prefer sendBeacon for reliability on page unload; fall back to fetch.
    try {
      if (navigator.sendBeacon && eventType === "page_exit") {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
      }
    } catch (e) {
      // ignore, fall through to fetch
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // helps short requests survive page navigation
      mode: "cors",
    }).catch(() => {
      // Backend/tunnel is off or unreachable — fail silently, no console spam, no retry loop.
    });
  }

  // ---- 6. BROWSER PROFILE / ENVIRONMENT SNAPSHOT ----
  function collectBrowserProfile() {
    let timezone = null;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {}

    let pointerFine = null;
    let pointerCoarse = null;
    try {
      pointerFine = window.matchMedia("(pointer: fine)").matches;
      pointerCoarse = window.matchMedia("(pointer: coarse)").matches;
    } catch (e) {}

    let cookiesEnabled = null;
    try {
      cookiesEnabled = navigator.cookieEnabled;
    } catch (e) {}

    let localStorageAvailable = false;
    let sessionStorageAvailable = false;
    try {
      localStorage.setItem("lumina_test", "1");
      localStorage.removeItem("lumina_test");
      localStorageAvailable = true;
    } catch (e) {}
    try {
      sessionStorage.setItem("lumina_test", "1");
      sessionStorage.removeItem("lumina_test");
      sessionStorageAvailable = true;
    } catch (e) {}

    return {
      timezone: timezone,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      language: navigator.language || null,
      languages: navigator.languages ? Array.from(navigator.languages) : null,
      platform: navigator.platform || null,
      screenWidth: window.screen ? window.screen.width : null,
      screenHeight: window.screen ? window.screen.height : null,
      availScreenWidth: window.screen ? window.screen.availWidth : null,
      availScreenHeight: window.screen ? window.screen.availHeight : null,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || null,
      colorDepth: window.screen ? window.screen.colorDepth : null,
      pixelDepth: window.screen ? window.screen.pixelDepth : null,
      touchSupport: "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      pointerFine: pointerFine,
      pointerCoarse: pointerCoarse,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      // deviceMemory is Chrome/Chromium-only (and HTTPS-only); will be null/undefined elsewhere.
      deviceMemory: navigator.deviceMemory || null,
      cookiesEnabled: cookiesEnabled,
      localStorageAvailable: localStorageAvailable,
      sessionStorageAvailable: sessionStorageAvailable,
      webdriver: navigator.webdriver === true, // basic automation signal
      userAgent: navigator.userAgent || null,
      visitCount: getVisitCount(),
    };
  }

  // ---- 7. UTM / CAMPAIGN PARAMETERS (from URL only, harmless) ----
  function collectUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content"),
    };
  }

  // ---- 8. EVENT LISTENERS ----

  function markFirstInteraction() {
    if (firstInteractionSent) return;
    firstInteractionSent = true;
    sendEvent("first_interaction", {
      msSincePageLoad: Date.now() - pageLoadTime,
    });
  }

  function setupClickTracking() {
    document.addEventListener(
      "click",
      function (e) {
        markFirstInteraction();
        const target = e.target;
        sendEvent("click", {
          x: e.clientX,
          y: e.clientY,
          pageX: e.pageX,
          pageY: e.pageY,
          tag: target ? target.tagName : null,
          id: target && target.id ? target.id : null,
          classes: target && target.className ? String(target.className) : null,
          text: target && target.innerText ? target.innerText.slice(0, 80) : null,
        });
      },
      { passive: true }
    );

    document.addEventListener(
      "contextmenu",
      function (e) {
        sendEvent("right_click", { x: e.clientX, y: e.clientY });
      },
      { passive: true }
    );
  }

  function setupScrollTracking() {
    let scrollTimeout = null;
    window.addEventListener(
      "scroll",
      function () {
        markFirstInteraction();
        const currentY = window.scrollY || 0;
        lastScrollDirection = currentY > lastScrollY ? "down" : currentY < lastScrollY ? "up" : lastScrollDirection;
        lastScrollY = currentY;

        const docHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        const viewportHeight = window.innerHeight;
        const scrollableHeight = Math.max(docHeight - viewportHeight, 1);
        const depthPercent = Math.min(100, Math.round((currentY / scrollableHeight) * 100));
        if (depthPercent > maxScrollDepth) maxScrollDepth = depthPercent;

        // Debounce: only send a scroll event every 400ms of inactivity
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function () {
          sendEvent("scroll", {
            scrollY: currentY,
            depthPercent: depthPercent,
            maxDepthPercent: maxScrollDepth,
            direction: lastScrollDirection,
          });
        }, 400);
      },
      { passive: true }
    );
  }

  function setupFocusBlurTracking() {
    window.addEventListener("focus", function () {
      sendEvent("window_focus", {});
    });
    window.addEventListener("blur", function () {
      sendEvent("window_blur", {});
    });
    document.addEventListener("visibilitychange", function () {
      sendEvent("visibility_change", { state: document.visibilityState });
    });
  }

  function setupFormTracking() {
    document.addEventListener(
      "submit",
      function (e) {
        const form = e.target;
        sendEvent("form_submit", {
          formId: form && form.id ? form.id : null,
          formName: form && form.name ? form.name : null,
          fieldCount: form && form.elements ? form.elements.length : null,
        });
      },
      { passive: true }
    );
  }

  function setupCopyPasteTracking() {
    document.addEventListener("copy", function () {
      sendEvent("copy_event", {});
    });
    document.addEventListener("paste", function () {
      sendEvent("paste_event", {});
    });
  }

  function setupErrorTracking() {
    window.addEventListener("error", function (e) {
      sendEvent("js_error", {
        message: e.message || null,
        source: e.filename || null,
        line: e.lineno || null,
        column: e.colno || null,
        stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 500) : null,
      });
    });
  }

  function setupPageExitTracking() {
    window.addEventListener("beforeunload", function () {
      sendEvent("page_exit", {
        msOnPage: Date.now() - pageLoadTime,
        maxScrollDepthPercent: maxScrollDepth,
      });
    });
  }

  // ---- 9. INITIAL PAGE VIEW EVENT ----
  function sendPageView() {
    sendEvent(
      "page_view",
      Object.assign({}, collectBrowserProfile(), collectUtmParams())
    );
  }

  // ---- 10. BOOTSTRAP ----
  loadConfig().then(function () {
    if (!loggingEnabled) {
      console.info("[LuminaLogger] Logging disabled or backend unavailable. Skipping.");
      return;
    }
    sendPageView();
    setupClickTracking();
    setupScrollTracking();
    setupFocusBlurTracking();
    setupFormTracking();
    setupCopyPasteTracking();
    setupErrorTracking();
    setupPageExitTracking();
  });
})();
// </script>
