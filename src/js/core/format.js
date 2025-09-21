export const formatDateCairo = (iso) => {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(iso));
  } catch {
    return iso || "";
  }
};

export const formatPrice = (n) =>
  `<span class="tabular-nums font-semibold">€${Number(n ?? 0).toFixed(
    2
  )}</span>`;

export const starsRow = (rating = 0) => {
  const r = Math.round(Number(rating) || 0);
  let html = "";
  for (let i = 1; i <= 5; i++) {
    const cls = i <= r ? "text-amber-500" : "text-gray-300";
    html += `<i data-lucide="star" class="h-4 w-4 ${cls}"></i>`;
  }
  return html;
};
