// ../js/auth-guard.js
(() => {
  const REFRESH_ENDPOINT = "/api/Auth/GetToken"; // returns a new token via cookie-based refresh
  const REDIRECT_FALLBACK = "/login.html"; // can be overridden via data-redirect on the <script>

  // ---- storage helpers
  const getStoredToken = () =>
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    null;

  const setStoredToken = (t) => {
    if (!t) return;
    localStorage.setItem("accessToken", t);
    localStorage.setItem("token", t);
  };

  // ---- jwt helpers
  function parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function isExpiredOrNear(token, skewMs = 60_000) {
    const p = parseJwt(token);
    if (!p || typeof p.exp !== "number") return true;
    const expMs = p.exp * 1000;
    return Date.now() + skewMs >= expMs;
  }

  async function refreshToken() {
    const res = await fetch(REFRESH_ENDPOINT, {
      method: "POST",
      credentials: "include",
    });
    // tolerate various token shapes
    const json = await res.json().catch(() => ({}));
    const tok =
      (json && json.token) ||
      (json && json.accessToken) ||
      (json && json.data && (json.data.token || json.data.accessToken));
    if (!res.ok || !tok) throw new Error("refresh failed");
    setStoredToken(tok);
    return tok;
  }

  async function ensureAuth(redirectTo) {
    // mark "checking" to avoid flashing content
    document.documentElement.setAttribute("data-auth", "checking");

    let token = getStoredToken();
    try {
      if (!token) {
        // try refresh via cookie
        token = await refreshToken();
      } else if (isExpiredOrNear(token)) {
        token = await refreshToken();
      }
    } catch {
      token = null;
    }

    if (!token) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace((redirectTo || REDIRECT_FALLBACK) + `?next=${next}`);
      return; // stop here
    }

    // authenticated 🎉
    window.AUTH_TOKEN = token; // optional: available for your scripts
    document.documentElement.setAttribute("data-auth", "ready");
    document.dispatchEvent(
      new CustomEvent("auth:ready", { detail: { token } })
    );
  }

  // cross-tab logout safety: if any tab clears token, kick this tab out
  window.addEventListener("storage", (e) => {
    if (["accessToken", "token", "jwt"].includes(e.key) && !getStoredToken()) {
      location.replace(REDIRECT_FALLBACK);
    }
  });

  // boot
  const thisScript = document.currentScript;
  const redirectAttr =
    (thisScript && thisScript.dataset && thisScript.dataset.redirect) || null;

  // run ASAP (the script should be loaded with "defer")
  ensureAuth(redirectAttr);
})();
