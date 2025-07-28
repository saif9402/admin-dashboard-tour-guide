function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

async function refreshAccessToken() {
  try {
    const response = await fetch(
      "https://tourguidehurghda.runasp.net/api/Auth/GetToken",
      {
        method: "POST",
        credentials: "include",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.succeeded) {
      console.warn("Refresh failed:", result.message || "Unknown error");
      return null;
    }

    const { accessToken, role, userName } = result.data;
    const payload = parseJwt(accessToken);

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("accessTokenExpiry", payload.exp * 1000);
    localStorage.setItem("userRole", role);
    localStorage.setItem("userName", userName);
    return accessToken;
  } catch (err) {
    console.error("Refresh error:", err);
    return null;
  }
}
