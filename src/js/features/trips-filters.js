import { state } from "../core/state.js";
import { debounce } from "../core/dom.js";
import { fetchTrips } from "./trips-table.js";

const openBtn = document.getElementById("openFiltersBtn");
const popover = document.getElementById("filtersPopover");
const sortSel = document.getElementById("tripSortSelectPopover");
const availSel = document.getElementById("availableFilterPopover");
const topSel = document.getElementById("topRatedFilterPopover");
const bestSel = document.getElementById("bestSellerFilterPopover");
const applyBtn = document.getElementById("applyFiltersBtn");
const resetBtn = document.getElementById("resetFiltersBtn");
const closeBtn = document.getElementById("closeFiltersBtn");
const activeDot = document.getElementById("activeFiltersDot");

let outside;

function syncPopover() {
  sortSel.value = state.filters.sort || "";
  availSel.value = state.currentIsAvailable || "";
  topSel.value = state.currentIsTopRated || "";
  bestSel.value = state.currentIsBestSeller || "";
}
function anyActive() {
  return !!(
    state.filters.sort ||
    state.currentIsAvailable ||
    state.currentIsTopRated ||
    state.currentIsBestSeller
  );
}
function updateDot() {
  activeDot?.classList.toggle("hidden", !anyActive());
}

function open() {
  syncPopover();
  popover.classList.remove("hidden");
  openBtn.setAttribute("aria-expanded", "true");
  outside = (e) => {
    if (!popover.contains(e.target) && e.target !== openBtn) close();
  };
  document.addEventListener("mousedown", outside);
  document.addEventListener("keydown", onEsc);
}
function close() {
  popover.classList.add("hidden");
  openBtn.setAttribute("aria-expanded", "false");
  document.removeEventListener("keydown", onEsc);
  if (outside) document.removeEventListener("mousedown", outside);
}
function onEsc(e) {
  if (e.key === "Escape") close();
}

export function wireFilters() {
  // search
  const searchInput = document.getElementById("tripSearch");
  const clearBtn = document.getElementById("clearSearchBtn");
  const langFilter = document.getElementById("langFilter");

  const applySearch = debounce(() => {
    state.filters.search = searchInput.value || "";
    state.currentPage = 1;
    fetchTrips(state.currentPage);
  }, 400);

  searchInput?.addEventListener("input", applySearch);
  clearBtn?.addEventListener("click", () => {
    if (!searchInput) return;
    searchInput.value = "";
    state.filters.search = "";
    state.currentPage = 1;
    fetchTrips(state.currentPage);
  });

  langFilter?.addEventListener("change", () => {
    state.filters.languageId = langFilter.value ? Number(langFilter.value) : "";
    state.currentPage = 1;
    fetchTrips(state.currentPage);
  });

  openBtn?.addEventListener("click", () => {
    const isOpen = openBtn.getAttribute("aria-expanded") === "true";
    isOpen ? close() : open();
  });
  closeBtn?.addEventListener("click", close);

  applyBtn?.addEventListener("click", () => {
    state.filters.sort = sortSel.value || "";
    state.currentIsAvailable = availSel.value || "";
    state.currentIsTopRated = topSel.value || "";
    state.currentIsBestSeller = bestSel.value || "";
    state.currentPage = 1;
    fetchTrips(state.currentPage);
    updateDot();
    close();
  });

  resetBtn?.addEventListener("click", () => {
    sortSel.value = availSel.value = topSel.value = bestSel.value = "";
    state.filters.sort = "";
    state.currentIsAvailable =
      state.currentIsTopRated =
      state.currentIsBestSeller =
        "";
    state.currentPage = 1;
    fetchTrips(state.currentPage);
    updateDot();
  });

  updateDot();
}
