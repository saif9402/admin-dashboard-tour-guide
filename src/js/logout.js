(() => {
  // --- Config ---------------------------------------------------------------
  const DEFAULT_REDIRECT = "../index.html"; // change if your login page differs
  const TOKEN_KEYS = ["accessToken", "token", "jwt", "refreshToken"];

  // --- Token helpers --------------------------------------------------------
  const getStoredToken = () =>
    TOKEN_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) || null;

  const clearStoredToken = () => {
    try {
      TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  // --- Fetch helper (use page's if present) --------------------------------
  const _authorizedFetch =
    typeof window.authorizedFetch === "function"
      ? window.authorizedFetch
      : async (url, options = {}, { retryOn401 = false } = {}) => {
          const headers = new Headers(options.headers || {});
          const t = getStoredToken();
          if (t) headers.set("Authorization", `Bearer ${t}`);
          return fetch(url, { ...options, headers });
        };

  // --- Small UI helper ------------------------------------------------------
  function setBtnLoading(el, on) {
    if (!el) return;
    if (on) {
      el.dataset._label = el.innerHTML;
      el.setAttribute("aria-disabled", "true");
      el.classList.add("opacity-60", "cursor-not-allowed");
      el.innerHTML = `
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span>Logging out…</span>
      `;
    } else {
      if (el.dataset._label) {
        el.innerHTML = el.dataset._label;
        delete el.dataset._label;
      }
      el.removeAttribute("aria-disabled");
      el.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }

  // --- Core logout ----------------------------------------------------------
  async function doLogout(triggerEl, redirectOverride) {
    setBtnLoading(triggerEl, true);
    try {
      const url =
        (window.ENDPOINTS && window.ENDPOINTS.logout) || "/api/Auth/LogOut";
      await _authorizedFetch(
        url,
        { method: "POST", credentials: "include" },
        { retryOn401: false }
      );
    } catch (_) {
      // ignore errors: still clear local auth
    } finally {
      clearStoredToken();
      const target =
        redirectOverride ||
        triggerEl?.getAttribute("data-logout-redirect") ||
        document.querySelector('meta[name="logout-redirect"]')?.content ||
        DEFAULT_REDIRECT;
      setTimeout(() => window.location.replace(target), 50);
      setBtnLoading(triggerEl, false);
    }
  }

  // --- Bind to any logout button/link --------------------------------------
  function attachLogoutHandlers(root = document) {
    const nodes = root.querySelectorAll(
      '#logoutBtn, [data-action="logout"], [data-logout], a:has([data-lucide="log-out"])'
    );
    nodes.forEach((el) => {
      if (el.__logoutBound) return;
      el.__logoutBound = true;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (el.getAttribute("aria-disabled") === "true") return;
        doLogout(el);
      });
    });
  }

  // Auto-bind on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => attachLogoutHandlers());
  } else {
    attachLogoutHandlers();
  }

  // Optional API if you ever want to call it manually:
  window.logoutHelpers = { doLogout, attachLogoutHandlers, clearStoredToken };
})();
