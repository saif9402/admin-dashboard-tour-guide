import { state } from "../core/state.js";
import {
  getLanguages,
  getActivities,
  getCategories,
  getIncludes,
} from "../api/meta.js";
import { getTripAdmin, addTrip, updateTrip } from "../api/trips.js";
import { openModal, closeModal } from "../ui/modal.js";
import { ensureIcons } from "../core/dom.js";
import { loadTripMedia } from "./trips-images.js";
import { loadReviews } from "./trips-reviews.js";
import { fetchTrips } from "./trips-table.js";

const form = document.getElementById("tripForm");

// Choices helpers
function getChoices(el, opts = { removeItemButton: true }) {
  if (el._choices && el._choices.initialised === false) {
    try {
      el._choices.destroy();
    } catch {}
    el._choices = null;
  }
  if (!el._choices) el._choices = new Choices(el, opts);
  return el._choices;
}
function setSelectedValues(selectId, values) {
  const el = document.getElementById(selectId);
  const ch = getChoices(el);
  ch.removeActiveItems();
  ch.setChoiceByValue((values || []).map(String));
}

// Dynamic rows
function createTranslationRow(type, langId = null, value = "") {
  const wrapper = document.createElement("div");
  wrapper.className =
    "group flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100/60 transition";
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", type === "name" ? "type" : "align-left");
  icon.className = "h-4 w-4 text-gray-500";
  const select = document.createElement("select");
  select.name = `${type}LangId`;
  select.className =
    "min-w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition";
  (state.availableLanguages || []).forEach((lang) => {
    const opt = document.createElement("option");
    opt.value = lang.id;
    opt.textContent = lang.name;
    select.appendChild(opt);
  });
  if (langId) select.value = langId;

  const input = document.createElement(type === "name" ? "input" : "textarea");
  input.name = `${type}Value`;
  input.placeholder =
    type === "name" ? "Translation" : "Description translation";
  input.className =
    "flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition";
  if (type === "description") input.rows = 2;
  input.value = value;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className =
    "ml-1 inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:text-red-600 hover:bg-white transition";
  removeBtn.innerHTML = '<i data-lucide="x" class="h-4 w-4"></i>';
  removeBtn.onclick = () => wrapper.remove();

  wrapper.append(icon, select, input, removeBtn);
  queueMicrotask(() => ensureIcons());
  return wrapper;
}

function createDateRow(value = "") {
  const wrapper = document.createElement("div");
  wrapper.className =
    "group flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100/60 transition";
  wrapper.innerHTML = `
    <i data-lucide="calendar" class="h-4 w-4 text-gray-500"></i>
    <input type="datetime-local" name="TripDates[]" required
      class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition" />
    <button type="button" class="ml-1 inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:text-red-600 hover:bg-white transition">
      <i data-lucide="x" class="h-4 w-4"></i>
    </button>`;
  const input = wrapper.querySelector("input");
  if (value) input.value = value;
  wrapper.querySelector("button").onclick = () => wrapper.remove();
  queueMicrotask(() => ensureIcons());
  return wrapper;
}

function isoToLocalInputValue(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function extractTranslations(containerId, type) {
  const container = document.getElementById(containerId);
  const translations = [];
  [...container.children].forEach((child) => {
    const langId = parseInt(
      child.querySelector(`select[name=${type}LangId]`).value
    );
    const text = child.querySelector(`[name=${type}Value]`).value.trim();
    if (langId && text)
      translations.push({ languageId: langId, translation: text });
  });
  return translations;
}
function combineTripTranslations(nameArr, descArr) {
  const byLang = new Map();
  nameArr.forEach(({ languageId, translation }) => {
    if (!byLang.has(languageId))
      byLang.set(languageId, { languageId, name: "", description: "" });
    byLang.get(languageId).name = translation;
  });
  descArr.forEach(({ languageId, translation }) => {
    if (!byLang.has(languageId))
      byLang.set(languageId, { languageId, name: "", description: "" });
    byLang.get(languageId).description = translation;
  });
  return [...byLang.values()].filter(
    (t) => t.name?.trim() || t.description?.trim()
  );
}

export async function initialFormSetup() {
  // languages first (needed by translation rows)
  state.availableLanguages = await getLanguages();

  // default translation rows + one date
  document
    .getElementById("nameTranslations")
    .appendChild(createTranslationRow("name"));
  document
    .getElementById("descriptionTranslations")
    .appendChild(createTranslationRow("description"));
  document.getElementById("tripDatesContainer").appendChild(createDateRow());

  // populate selects
  const activities = await getActivities();
  const languages = await getLanguages();
  const categories = await getCategories();
  const includes = await getIncludes();
  state.allIncludes = includes;

  getChoices(document.getElementById("activitiesSelect")).setChoices(
    activities.map((a) => ({ value: String(a.id), label: a.name })),
    "value",
    "label",
    true
  );
  getChoices(document.getElementById("languagesSelect")).setChoices(
    languages.map((l) => ({ value: String(l.id), label: l.name })),
    "value",
    "label",
    true
  );
  getChoices(document.getElementById("categorySelect")).setChoices(
    categories.map((c) => ({ value: String(c.id), label: c.name })),
    "value",
    "label",
    true
  );
  getChoices(document.getElementById("includesSelect")).setChoices(
    includes.map((i) => ({ value: String(i.id), label: i.name })),
    "value",
    "label",
    true
  );

  // init NotIncludes as empty Choices; refreshed on Includes change
  getChoices(document.getElementById("notIncludesSelect"));

  document
    .getElementById("includesSelect")
    .addEventListener("change", refreshNotIncludesOptions);
  refreshNotIncludesOptions();

  // Add/remove row buttons
  document
    .getElementById("addNameTranslation")
    .addEventListener("click", () => {
      document
        .getElementById("nameTranslations")
        .appendChild(createTranslationRow("name"));
    });
  document
    .getElementById("addDescriptionTranslation")
    .addEventListener("click", () => {
      document
        .getElementById("descriptionTranslations")
        .appendChild(createTranslationRow("description"));
    });
  document.getElementById("addTripDate").addEventListener("click", () => {
    document.getElementById("tripDatesContainer").appendChild(createDateRow());
  });

  // cancel buttons
  ["cancelBtn", "cancelBtn2"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => closeModal());
  });

  // form submit
  form.addEventListener("submit", onSubmit);
}

function refreshNotIncludesOptions() {
  const includesEl = document.getElementById("includesSelect");
  const notSel = document.getElementById("notIncludesSelect");
  const notChoices =
    notSel._choices || new Choices(notSel, { removeItemButton: true });

  const selected = [...includesEl.selectedOptions].map((opt) =>
    parseInt(opt.value)
  );
  const remaining = state.allIncludes
    .filter((i) => !selected.includes(i.id))
    .map((i) => ({ value: String(i.id), label: i.name }));
  notChoices.clearChoices();
  notChoices.setChoices(remaining, "value", "label", true);

  // prune invalid selected not-includes
  const valid = [...notSel.selectedOptions]
    .map((o) => parseInt(o.value))
    .filter((id) => !selected.includes(id));
  setSelectedValues("notIncludesSelect", valid);
}

export function openAddTripModal() {
  state.modalMode = "add";
  state.editTripId = null;
  state.currentTripId = null;
  state.mainImageName = null;
  document.getElementById("modalTitle").textContent = "Add Trip";
  document.getElementById("submitBtn").textContent = "Save";
  resetForm();
  // hide Reviews
  document.getElementById("tabReviews").classList.add("hidden");
  document.getElementById("tabContentReviews").classList.add("hidden");
  showInfoTab();
  openModal();
  ensureIcons();
}

export async function openEditTripModal(tripId) {
  state.modalMode = "edit";
  state.editTripId = tripId;
  state.currentTripId = tripId;
  state.mainImageName = null;
  document.getElementById("modalTitle").textContent = "Edit Trip";
  document.getElementById("submitBtn").textContent = "Update";
  resetForm();

  const r = await getTripAdmin(tripId);
  if (!r.ok || r.json?.succeeded === false) {
    tgToast({ variant: "error", message: "Failed to load trip data." });
    return;
  }

  await loadIntoForm(r.json.data);
  // images
  await loadTripMedia(tripId);
  // reviews
  document.getElementById("tabReviews").classList.remove("hidden");
  state.reviewsSortValue =
    document.getElementById("reviewsSortSelect")?.value || "date:desc";
  await loadReviews(tripId, state.reviewsSortValue);

  showInfoTab();
  openModal();
  ensureIcons();
}

function resetForm() {
  form.reset();
  const nameC = document.getElementById("nameTranslations");
  const descC = document.getElementById("descriptionTranslations");
  nameC.innerHTML = "";
  descC.innerHTML = "";
  nameC.appendChild(createTranslationRow("name"));
  descC.appendChild(createTranslationRow("description"));
  const dates = document.getElementById("tripDatesContainer");
  dates.innerHTML = "";
  dates.appendChild(createDateRow());

  [
    "activitiesSelect",
    "languagesSelect",
    "includesSelect",
    "notIncludesSelect",
    "categorySelect",
  ].forEach((id) => {
    const el = document.getElementById(id);
    el._choices?.removeActiveItems();
  });

  document.getElementById("tripImages").value = "";
  document.getElementById("imagePreview").innerHTML = "";

  document.getElementById("existingImagesSection").classList.add("hidden");
  document.getElementById("existingImagesGrid").innerHTML = "";
  document.getElementById("existingImagesCount").textContent = "";
  refreshNotIncludesOptions();
}

async function loadIntoForm(data) {
  form.Price.value = data.price;
  form.Duration.value = data.duration;
  form.IsAvailable.checked = data.isAvailable;

  const nameC = document.getElementById("nameTranslations");
  const descC = document.getElementById("descriptionTranslations");
  nameC.innerHTML = "";
  descC.innerHTML = "";
  (data.name || []).forEach((t) =>
    nameC.appendChild(createTranslationRow("name", t.languageId, t.translation))
  );
  (data.description || []).forEach((t) =>
    descC.appendChild(
      createTranslationRow("description", t.languageId, t.translation)
    )
  );

  const dates = document.getElementById("tripDatesContainer");
  dates.innerHTML = "";
  (data.tripDates || []).forEach((date) =>
    dates.appendChild(createDateRow(isoToLocalInputValue(date)))
  );

  const getIds = (arr, key = "id") =>
    (arr || []).map((x) => (typeof x === "object" ? x[key] : x));
  const activityIds = getIds(data.activities);
  const languageIds = getIds(data.languages);
  const includeIds = getIds(data.includes);
  const notIncludeIds = getIds(data.notIncludes);

  setSelectedValues("activitiesSelect", activityIds);
  setSelectedValues("languagesSelect", languageIds);
  setSelectedValues("includesSelect", includeIds);
  refreshNotIncludesOptions();
  setSelectedValues(
    "notIncludesSelect",
    (notIncludeIds || []).filter((id) => !includeIds.includes(id))
  );

  document
    .getElementById("categorySelect")
    ._choices?.setChoiceByValue(String(data.categoryId));
}

async function onSubmit(e) {
  e.preventDefault();
  const nameArr = extractTranslations("nameTranslations", "name");
  const descArr = extractTranslations("descriptionTranslations", "description");
  const tripDates = [...form.querySelectorAll("input[name='TripDates[]']")].map(
    (i) => new Date(i.value).toISOString()
  );

  const common = {
    Price: parseFloat(form.Price.value),
    Duration: parseInt(form.Duration.value),
    TripDates: tripDates,
    IsAvailable: form.IsAvailable.checked,
    CategoryId: parseInt(form.CategoryId.value),
    Activities: [...form.Activities.selectedOptions].map((o) =>
      parseInt(o.value)
    ),
    Languages: [...form.Languages.selectedOptions].map((o) =>
      parseInt(o.value)
    ),
    Includes: [...form.Includes.selectedOptions].map((o) => parseInt(o.value)),
    NotIncludes: [...form.NotIncludes.selectedOptions].map((o) =>
      parseInt(o.value)
    ),
  };

  if (state.modalMode === "add") {
    const payload = { ...common, Name: nameArr, Description: descArr };
    const r = await addTrip(payload);
    if (!r.ok || r.json?.succeeded === false) {
      tgToast({ variant: "error", message: "Failed to add trip." });
      return;
    }
    state.currentTripId = r.json.data; // new id
    tgToast({ variant: "success", message: "Trip added successfully." });
    // switch to Images tab
    showImagesTab();
    fetchTrips();
  } else {
    const payload = {
      tripTranslations: combineTripTranslations(nameArr, descArr),
      duration: common.Duration,
      price: common.Price,
      isAvailable: common.IsAvailable,
      tripDates: common.TripDates,
      categoryId: common.CategoryId,
      activities: common.Activities,
      languages: common.Languages,
      includes: common.Includes,
      notIncludes: common.NotIncludes,
    };
    const r = await updateTrip(state.editTripId, payload);
    if (!r.ok || r.json?.succeeded === false) {
      tgToast({ variant: "error", message: "Failed to update trip." });
      return;
    }
    tgToast({ variant: "success", message: "Trip updated successfully." });
    closeModal();
    fetchTrips();
  }
}

// tabs
function showTab(info = false, images = false, reviews = false) {
  document.getElementById("tabContentInfo").classList.toggle("hidden", !info);
  document
    .getElementById("tabContentImages")
    .classList.toggle("hidden", !images);
  document
    .getElementById("tabContentReviews")
    .classList.toggle("hidden", !reviews);

  document
    .getElementById("tabInfo")
    .setAttribute("aria-selected", info ? "true" : "false");
  document
    .getElementById("tabImages")
    .setAttribute("aria-selected", images ? "true" : "false");
  document
    .getElementById("tabReviews")
    .setAttribute("aria-selected", reviews ? "true" : "false");

  document.getElementById("tabInfo").classList.toggle("bg-white", info);
  document.getElementById("tabInfo").classList.toggle("text-gray-900", info);
  document.getElementById("tabInfo").classList.toggle("shadow", info);
  document.getElementById("tabImages").classList.toggle("bg-white", images);
  document
    .getElementById("tabImages")
    .classList.toggle("text-gray-900", images);
  document.getElementById("tabImages").classList.toggle("shadow", images);
  document.getElementById("tabReviews").classList.toggle("bg-white", reviews);
  document
    .getElementById("tabReviews")
    .classList.toggle("text-gray-900", reviews);
  document.getElementById("tabReviews").classList.toggle("shadow", reviews);
}

export function showImagesTab() {
  showTab(false, true, false);
}
export function showInfoTab() {
  showTab(true, false, false);
}
export function showReviewsTab() {
  showTab(false, false, true);
}

export function wireTabButtons() {
  document
    .getElementById("tabImages")
    ?.addEventListener("click", showImagesTab);
  document.getElementById("tabInfo")?.addEventListener("click", showInfoTab);
  document
    .getElementById("tabReviews")
    ?.addEventListener("click", showReviewsTab);
}
