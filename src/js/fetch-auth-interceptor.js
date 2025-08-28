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

  // ---- patch global fetch
  window.fetch = async (input, init = {}) => {
    // Always work with a Request we can clone (so we can retry safely)
    const originalReq =
      input instanceof Request ? input : new Request(input, init);

    const url = originalReq.url;
    const doAuth = isSameOriginApi(url);

    // Build a request with Authorization header if needed
    const makeAuthedRequest = (token) => {
      const headers = new Headers(originalReq.headers);
      if (doAuth && token) headers.set("Authorization", `Bearer ${token}`);

      // If body is a plain object (from init), set JSON content-type once.
      // (When originalReq was created from init with a plain object body)
      const maybeJsonBody =
        !(init instanceof Request) &&
        init &&
        init.body &&
        typeof init.body === "object" &&
        !(init.body instanceof FormData) &&
        !(init.body instanceof Blob) &&
        !(init.body instanceof URLSearchParams);

      if (maybeJsonBody && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      // Rebuild request so body is re-readable on retry
      return new Request(originalReq, { headers });
    };

    // Pre-emptive refresh if token is missing/near expiry
    if (doAuth) {
      try {
        await ensureFreshTokenIfNeeded();
      } catch {
        // ignore here; the request may still go through or we'll handle 401 below
      }
    }

    let token = getStoredToken();
    let req = makeAuthedRequest(token);

    // First attempt
    let res = await nativeFetch(req);

    // On 401, refresh once then retry
    if (doAuth && res.status === 401) {
      try {
        // coalesce concurrent refreshes
        refreshingPromise ||= refreshToken().finally(
          () => (refreshingPromise = null)
        );
        await refreshingPromise;

        token = getStoredToken();
        req = makeAuthedRequest(token);
        res = await nativeFetch(req);
      } catch (e) {
        // Refresh failed → clear tokens and bounce to login
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
        // Return the original 401 response in case someone awaits it
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
