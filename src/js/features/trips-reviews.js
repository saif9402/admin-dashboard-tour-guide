import { state } from "../core/state.js";
import { getReviews, deleteReview } from "../api/reviews.js";
import { formatDateCairo, starsRow } from "../core/format.js";
import { ensureIcons } from "../core/dom.js";

const list = document.getElementById("reviewsList");
const empty = document.getElementById("reviewsEmpty");
const countEl = document.getElementById("reviewsCount");
const sortSel = document.getElementById("reviewsSortSelect");

export async function loadReviews(tripId, sortVal = state.reviewsSortValue) {
  list.innerHTML = skeleton();
  empty.classList.add("hidden");
  const r = await getReviews(tripId, sortVal);
  if (!r.ok || r.json?.succeeded === false) {
    list.innerHTML = `<div class="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 flex items-center gap-2">
      <i data-lucide="alert-triangle" class="h-4 w-4"></i><span>Failed to load reviews.</span></div>`;
    ensureIcons();
    return;
  }
  const page = r.json?.data || {};
  const items = Array.isArray(page.data) ? page.data : [];
  render(items, page.count);
}

export function wireReviews() {
  sortSel?.addEventListener("change", () => {
    state.reviewsSortValue = sortSel.value;
    if (state.modalMode === "edit" && state.currentTripId) {
      loadReviews(state.currentTripId, state.reviewsSortValue);
    }
  });

  document
    .getElementById("refreshReviewsBtn")
    ?.addEventListener("click", () => {
      if (state.modalMode === "edit" && state.currentTripId) {
        loadReviews(state.currentTripId, state.reviewsSortValue);
      }
    });

  list?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action='delete-review']");
    if (!btn) return;
    const userId = btn.dataset.userId || null;
    if (!state.currentTripId || !Number.isFinite(Number(userId))) {
      tgToast({ variant: "warning", message: "Cannot delete review." });
      return;
    }
    const ok = await tgConfirm({
      title: "Delete review?",
      body: "This action cannot be undone.",
      confirmText: "Delete review",
      danger: true,
    });
    if (!ok) return;
    const r = await deleteReview(state.currentTripId, userId);
    if (!r.ok || r.json?.succeeded === false) {
      tgToast({ variant: "error", message: "Failed to delete review." });
      return;
    }
    tgToast({ variant: "success", message: "Review deleted." });
    loadReviews(state.currentTripId, state.reviewsSortValue);
  });
}

function render(items, totalCount) {
  list.innerHTML = "";
  state.lastReviews = items;
  if (!items.length) {
    empty.classList.remove("hidden");
    countEl.textContent = String(totalCount || 0);
    return;
  }
  empty.classList.add("hidden");
  items.forEach((rv) => {
    const userId = rv.userId ?? null;
    const card = document.createElement("div");
    card.className = "rounded-xl border border-gray-200 bg-white p-4";
    card.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/10 text-indigo-700 font-semibold ring-1 ring-indigo-200">
            ${(rv.userName || "?").trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <div class="text-sm font-semibold text-gray-900">${
              rv.userName || "Anonymous"
            }</div>
            <div class="text-xs text-gray-500">${formatDateCairo(
              rv.createdAt
            )}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-0.5">${starsRow(rv.rating)}</div>
          <span class="text-xs text-gray-500">(${rv.rating ?? "-"}/5)</span>
          <button type="button" class="ml-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 ring-1 ring-rose-200 hover:bg-rose-100"
                  data-action="delete-review" ${
                    userId != null ? "" : "disabled"
                  }
                  data-user-id="${userId ?? ""}" title="${
      userId != null ? "Delete review" : "Not deletable (no userId)"
    }">
            <i data-lucide="trash-2" class="h-3.5 w-3.5"></i> Delete
          </button>
        </div>
      </div>
      <p class="mt-3 text-sm text-gray-700 whitespace-pre-line">${
        rv.comment || ""
      }</p>`;
    list.appendChild(card);
  });
  countEl.textContent = String(totalCount ?? items.length);
  ensureIcons();
}

function skeleton(count = 3) {
  return Array.from({ length: count })
    .map(
      () => `
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-full tg-shimmer"></div>
          <div>
            <div class="h-3 w-28 rounded tg-shimmer"></div>
            <div class="h-3 w-20 rounded tg-shimmer mt-1"></div>
          </div>
        </div>
        <div class="h-6 w-20 rounded tg-shimmer"></div>
      </div>
      <div class="h-4 w-full rounded tg-shimmer mt-3"></div>
      <div class="h-4 w-2/3 rounded tg-shimmer mt-2"></div>
    </div>`
    )
    .join("");
}
