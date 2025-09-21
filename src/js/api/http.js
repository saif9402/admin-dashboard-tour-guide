// Tiny fetch wrapper: inject token if available, parse JSON safely
export async function http(url, opts = {}) {
  const token = localStorage.getItem("accessToken");
  const headers = {
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, { ...opts, headers });
  let json, text;
  try {
    json = await res.clone().json();
  } catch {
    text = await res.text();
  }
  return { ok: res.ok, status: res.status, json, text };
}
