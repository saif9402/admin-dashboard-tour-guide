import { state } from "../core/state.js";
import { ensureIcons } from "../core/dom.js";
import { getAllTrips } from "../api/trips.js";
import {
  badge,
  availabilityBadge,
  durationPill,
  initialBubble,
} from "../ui/components.js";
import { formatPrice } from "../core/format.js";

const tripTable = document.getElementById("tripTable");
const pagination = document.getElementById("pagination");

export async function fetchTrips(page = 1) {
  showTableSkeleton();
  state.currentPage = page;

  const params = {
    pageNumber: String(page),
    pageSize: String(state.pageSize),
  };

  const { filters } = state;
  if (filters.search?.trim()) params.Search = filters.search.trim();
  if (filters.languageId)
    params.TranslationLanguageId = String(filters.languageId);
  if (filters.sort) params.Sort = filters.sort;
  if (state.currentIsAvailable !== "")
    params.IsAvailable = state.currentIsAvailable;
  if (state.currentIsTopRated !== "")
    params.IsTopRated = state.currentIsTopRated;
  if (state.currentIsBestSeller !== "")
    params.IsBestSeller = state.currentIsBestSeller;

  const r = await getAllTrips(params);
  if (!r.ok || !r.json?.succeeded) {
    tripTable.innerHTML = `<tr><td colspan="6" class="text-center text-rose-600 py-6">Failed to load trips</td></tr>`;
    return;
  }
  const pageData = r.json.data || {};
  const items = Array.isArray(pageData.data) ? pageData.data : [];
  renderTrips(items);
  renderPagination(pageData.pageNumber || page, pageData.count || items.length);
  ensureIcons();
}

export function renderTrips(trips) {
  state.lastTripsPage = Array.isArray(trips) ? [...trips] : [];
  const toRender = applySort(state.lastTripsPage);

  tripTable.innerHTML = "";
  if (!toRender.length) {
    tripTable.innerHTML = `
      <tr><td colspan="6" class="px-6 py-12">
        <div class="flex items-center justify-center gap-3 text-gray-600">
          <i data-lucide="map" class="h-5 w-5"></i>
          <span>No trips found</span>
          <button class="ml-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-white text-xs font-semibold hover:bg-blue-700"
                  id="openAddTripBtn"><i data-lucide="plus" class="h-4 w-4"></i> Add Trip</button>
        </div>
      </td></tr>`;
    ensureIcons();
    return;
  }

  toRender.forEach((trip) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 transition-colors";
    row.innerHTML = `
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          ${initialBubble(trip.name)}
          <div>
            <div class="font-medium text-gray-900">${trip.name}</div>
            <div class="text-xs text-gray-500">#${trip.id}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">${badge(
        trip.category || "Uncategorized",
        "violet"
      )}</td>
      <td class="px-6 py-4">${formatPrice(trip.price)}</td>
      <td class="px-6 py-4">${durationPill(trip.duration)}</td>
      <td class="px-6 py-4">${availabilityBadge(!!trip.isAvailable)}</td>
      <td class="px-6 py-4">
        <div class="inline-flex overflow-hidden rounded-lg ring-1 ring-gray-200 bg-white shadow-sm">
          <button class="px-2.5 py-2 text-blue-600 hover:bg-blue-50" title="Edit" data-action="edit" data-id="${
            trip.id
          }">
            <i data-lucide="pencil" class="h-4 w-4"></i>
          </button>
          <div class="w-px bg-gray-200"></div>
          <button class="px-2.5 py-2 text-rose-600 hover:bg-rose-50" title="Delete" data-action="delete" data-id="${
            trip.id
          }">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </div>
      </td>`;
    tripTable.appendChild(row);
  });
  ensureIcons();
}

export function bindRowActions({ onAdd, onEdit, onDelete }) {
  tripTable.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === "edit") onEdit?.(id);
    if (btn.dataset.action === "delete") onDelete?.(id);
  });
  document.addEventListener("click", (e) => {
    if (e.target?.id === "openAddTripBtn") onAdd?.();
  });
}

function applySort(list) {
  if (!list?.length || !state.sortState.key) return list || [];
  const dir = state.sortState.dir === "desc" ? -1 : 1;
  const key = state.sortState.key;
  return [...list].sort((a, b) => {
    let va = (a[key] ?? "").toString().toLowerCase();
    let vb = (b[key] ?? "").toString().toLowerCase();
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

function showTableSkeleton(rows = 8) {
  let html = "";
  for (let i = 0; i < rows; i++) {
    html += `
      <tr class="hover:bg-gray-50/70">
        <td class="px-6 py-4"><div class="h-4 w-40 rounded tg-shimmer"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-24 rounded tg-shimmer"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-16 rounded tg-shimmer"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-12 rounded tg-shimmer"></div></td>
        <td class="px-6 py-4"><div class="h-5 w-20 rounded-full tg-shimmer"></div></td>
        <td class="px-6 py-4"><div class="h-8 w-24 rounded-lg tg-shimmer"></div></td>
      </tr>`;
  }
  tripTable.innerHTML = html;
}

function renderPagination(current, totalCount) {
  const totalPages = Math.ceil(totalCount / state.pageSize);
  pagination.innerHTML = "";
  const group = document.createElement("div");
  group.className =
    "inline-flex overflow-hidden rounded-xl ring-1 ring-gray-200 bg-white shadow-sm";

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  prev.disabled = current === 1;
  prev.className = "px-4 py-2 disabled:opacity-50 hover:bg-gray-50";
  prev.onclick = () => {
    if (current > 1) {
      state.currentPage--;
      fetchTrips(state.currentPage);
    }
  };

  const info = document.createElement("span");
  info.className = "px-4 py-2 text-gray-600 border-x border-gray-200";
  info.textContent = `Page ${current} of ${totalPages}`;

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = current === totalPages;
  next.className = "px-4 py-2 disabled:opacity-50 hover:bg-gray-50";
  next.onclick = () => {
    if (current < totalPages) {
      state.currentPage++;
      fetchTrips(state.currentPage);
    }
  };

  group.append(prev, info, next);
  pagination.appendChild(group);
}

export function setupHeaderSort() {
  document.querySelectorAll("thead [data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const keyMap = { name: "name", category: "category" };
      const key = keyMap[btn.dataset.sort];
      if (!key) return;
      if (state.sortState.key === key)
        state.sortState.dir = state.sortState.dir === "asc" ? "desc" : "asc";
      else {
        state.sortState.key = key;
        state.sortState.dir = "asc";
      }
      // update badges
      document
        .querySelectorAll("thead .sort-badge")
        .forEach((b) => b.classList.add("hidden"));
      btn.querySelector(".sort-badge").classList.remove("hidden");
      btn.querySelector(".sort-badge").textContent =
        state.sortState.dir === "asc" ? "▲" : "▼";
      renderTrips(state.lastTripsPage);
    });
  });
}
