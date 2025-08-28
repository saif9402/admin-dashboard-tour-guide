// ../js/fetch-auth-interceptor.js
(() => {
  const API_PREFIX = "/api/";
  const REFRESH_ENDPOINT = "/api/Auth/GetToken";

  const nativeFetch = window.fetch.bind(window);
  let refreshingPromise = null;

  // ---- token helpers (kept in sync with auth-guard.js)
  const getStoredToken = () =>
    window.AUTH_TOKEN ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    null;

  const setStoredToken = (t) => {
    if (!t) return;
    localStorage.setItem("accessToken", t);
    localStorage.setItem("token", t);
    window.AUTH_TOKEN = t;
    document.dispatchEvent(
      new CustomEvent("auth:token", { detail: { token: t } })
    );
  };

  const decodeJwt = (t) => {
    try {
      const b64 = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(b64));
    } catch {
      return null;
    }
  };
  const nearExpiry = (t, skewMs = 60_000) => {
    const p = decodeJwt(t);
    if (!p || !p.exp) return false;
    return Date.now() + skewMs >= p.exp * 1000;
  };

  // ---- refresh using cookie (credentials: include)
  async function refreshToken() {
    const res = await nativeFetch(REFRESH_ENDPOINT, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    const tok = json?.data?.accessToken || json?.accessToken || json?.token;
    if (!res.ok || !tok) throw new Error("refresh failed");
    setStoredToken(tok);
    return tok;
  }

  function isSameOriginApi(urlStr) {
    try {
      const u = new URL(urlStr, location.origin);
      return (
        u.origin === location.origin &&
        u.pathname.startsWith(API_PREFIX) &&
        !u.pathname.startsWith(REFRESH_ENDPOINT)
      );
    } catch {
      return false;
    }
  }

  async function ensureFreshTokenIfNeeded() {
    const t = getStoredToken();
    if (!t) {
      // no token yet → try refresh (may fail if user not logged in)
      refreshingPromise ||= refreshToken().finally(
        () => (refreshingPromise = null)
      );
      return refreshingPromise;
    }
    if (nearExpiry(t)) {
      refreshingPromise ||= refreshToken().finally(
        () => (refreshingPromise = null)
      );
      return refreshingPromise;
    }
    return t;
  }

  window.fetch = async (input, init = {}) => {
    const nativeFetch =
      window.__nativeFetch ||
      (window.__nativeFetch = window.fetch.bind(window));
    const originalInput = input;
    const urlStr = input instanceof Request ? input.url : String(input);
    const doAuth = isSameOriginApi(urlStr);

    // Pre-emptive refresh
    if (doAuth) {
      try {
        await ensureFreshTokenIfNeeded();
      } catch {}
    }

    let token = getStoredToken();

    // Build final headers without touching the body
    const baseHeaders = new Headers(
      (init && init.headers) ||
        (input instanceof Request ? input.headers : undefined)
    );
    if (doAuth && token) baseHeaders.set("Authorization", `Bearer ${token}`);

    // Only set JSON content-type when the body is a plain object (NOT FormData)
    const body = init && init.body;
    const isJsonLike =
      body &&
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof URLSearchParams);

    if (isJsonLike && !baseHeaders.has("Content-Type")) {
      baseHeaders.set("Content-Type", "application/json");
    }

    const finalInit = { ...init, headers: baseHeaders };

    // First attempt (IMPORTANT: do not wrap Request; keep FormData as-is)
    let res = await nativeFetch(originalInput, finalInit);

    // On 401, refresh once then retry with the same body
    if (doAuth && res.status === 401) {
      try {
        refreshingPromise ||= refreshToken().finally(
          () => (refreshingPromise = null)
        );
        await refreshingPromise;

        token = getStoredToken();
        const retryHeaders = new Headers(finalInit.headers || {});
        if (token) retryHeaders.set("Authorization", `Bearer ${token}`);

        res = await nativeFetch(originalInput, {
          ...finalInit,
          headers: retryHeaders,
        });
      } catch {
        // purge tokens and bounce (same as your code)
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("jwt");

        const guardScript = document.querySelector(
          'script[src$="auth-guard.js"]'
        );
        const redirect =
          (guardScript &&
            guardScript.dataset &&
            guardScript.dataset.redirect) ||
          "/login.html";
        const next = encodeURIComponent(location.pathname + location.search);
        location.replace(`${redirect}?next=${next}`);
        return res;
      }
    }

    return res;
  };

  window.api = {
    getToken: getStoredToken,
    setToken: setStoredToken,
    refresh: () =>
      (refreshingPromise ||= refreshToken().finally(
        () => (refreshingPromise = null)
      )),
  };
})();
