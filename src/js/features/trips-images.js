import { state } from "../core/state.js";
import { getTripPublic } from "../api/trips.js";
import { addImagesToTrip, deleteImagesFromTrip } from "../api/media.js";
import { ensureIcons } from "../core/dom.js";

const section = document.getElementById("existingImagesSection");
const grid = document.getElementById("existingImagesGrid");
const countEl = document.getElementById("existingImagesCount");
const deleteBtn = document.getElementById("deleteSelectedImagesBtn");
const input = document.getElementById("tripImages");
const preview = document.getElementById("imagePreview");

export function wireImages() {
  deleteBtn?.addEventListener("click", deleteSelectedImages);
  input?.addEventListener("change", onFilesChosen);
  document
    .getElementById("imageUploadForm")
    ?.addEventListener("submit", uploadImages);
}

export async function loadTripMedia(tripId) {
  section.classList.remove("hidden");
  grid.innerHTML = skeleton();
  const r = await getTripPublic(tripId);
  if (!r.ok || r.json?.succeeded === false) {
    grid.innerHTML = err("Failed to load images.");
    ensureIcons();
    return;
  }
  renderExisting(r.json.data);
}

function renderExisting(data) {
  state.selectedImageIds.clear();
  updateDeleteButton();

  const main = data?.mainImage;
  const others = Array.isArray(data?.images) ? data.images : [];
  const rest = main ? others.filter((im) => im.id !== main.id) : others;
  state.currentMainImageId = main?.id ?? null;

  grid.innerHTML = "";
  if (!main && rest.length === 0) {
    grid.innerHTML = empty();
    section.classList.remove("hidden");
    countEl.textContent = "0 images";
    ensureIcons();
    return;
  }
  if (main?.imageURL) grid.appendChild(card(main.id, main.imageURL, true));
  rest.forEach(
    (im) => im?.imageURL && grid.appendChild(card(im.id, im.imageURL, false))
  );
  const total = (main ? 1 : 0) + rest.length;
  countEl.textContent = `${total} image${total === 1 ? "" : "s"}`;
  section.classList.remove("hidden");
  ensureIcons();
}

function card(id, url, isMain = false) {
  const c = document.createElement("div");
  c.className =
    "relative rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm bg-white transition";
  c.innerHTML = `
    ${
      isMain
        ? `<div class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 bg-amber-50 text-amber-700 ring-amber-100">
        <i data-lucide="star" class="h-3.5 w-3.5"></i> Main</div>`
        : ""
    }
    <label class="absolute top-2 right-2 inline-flex items-center rounded-lg bg-white/90 ring-1 ring-gray-200 p-1" title="${
      isMain ? "This is the current MAIN image" : ""
    }">
      <input type="checkbox" class="h-4 w-4 rounded text-rose-600" data-img-id="${id}">
    </label>
    <img src="${url}" alt="Trip image" loading="lazy" class="w-full h-40 object-cover select-none"/>
  `;
  c.querySelector("input").addEventListener("change", (e) => {
    e.target.checked
      ? state.selectedImageIds.add(id)
      : state.selectedImageIds.delete(id);
    c.classList.toggle("ring-rose-300", e.target.checked);
    updateDeleteButton();
  });
  return c;
}

async function deleteSelectedImages() {
  if (!state.currentTripId || state.selectedImageIds.size === 0) return;
  const count = state.selectedImageIds.size;
  const includesMain =
    state.currentMainImageId != null &&
    state.selectedImageIds.has(state.currentMainImageId);

  const ok = await tgConfirm({
    title: `Delete ${count} image${count === 1 ? "" : "s"}?`,
    body: includesMain
      ? "⚠️ You are deleting the CURRENT MAIN image.\nNo main image will remain unless you set another one later."
      : "This cannot be undone.",
    confirmText: "Delete",
    danger: true,
  });
  if (!ok) return;

  const fd = new FormData();
  [...state.selectedImageIds].forEach((id) =>
    fd.append("imageIds", String(id))
  );
  const r = await deleteImagesFromTrip(state.currentTripId, fd);
  if (!r.ok || r.json?.succeeded === false) {
    tgToast({ variant: "error", message: "Failed to delete images." });
    return;
  }
  tgToast({ variant: "success", message: "Selected images deleted." });
  state.selectedImageIds.clear();
  updateDeleteButton();
  await loadTripMedia(state.currentTripId);
}

function updateDeleteButton() {
  const count = state.selectedImageIds.size;
  deleteBtn.disabled = count === 0;
  deleteBtn.title =
    count === 0
      ? "Select images to enable"
      : `Delete ${count} selected image${count === 1 ? "" : "s"}`;
}

async function uploadImages(e) {
  e.preventDefault();
  if (!state.currentTripId) {
    tgToast({ variant: "warning", message: "No trip selected." });
    return;
  }
  const files = Array.from(input.files);
  if (!files.length) {
    tgToast({ variant: "info", message: "Please select at least one image." });
    return;
  }

  const fd = new FormData();
  files.forEach((file, i) => {
    const isMain = file.name === state.mainImageName;
    fd.append(`images[${i}].Image`, file);
    fd.append(`images[${i}].IsMainImage`, String(isMain));
  });

  const r = await addImagesToTrip(state.currentTripId, fd);
  if (!r.ok || r.json?.succeeded === false) {
    tgToast({ variant: "error", message: "Upload failed." });
    return;
  }
  tgToast({ variant: "success", message: "Images uploaded successfully." });
  input.value = "";
  preview.innerHTML = "";
  state.mainImageName = null;
  await loadTripMedia(state.currentTripId);
  state.selectedImageIds.clear();
  updateDeleteButton();
}

function onFilesChosen(e) {
  preview.innerHTML = "";
  state.mainImageName = null;
  const files = Array.from(e.target.files);
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const card = document.createElement("div");
      card.className =
        "relative rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm bg-white";
      card.innerHTML = `
        <img src="${ev.target.result}" class="w-full h-40 object-cover" />
        <div class="flex items-center gap-2 px-3 py-2">
          <input type="checkbox" class="h-4 w-4 rounded text-blue-600" name="mainImage" data-filename="${file.name}" />
          <label class="text-sm text-gray-700">Use as main image</label>
        </div>`;
      card.querySelector("input").addEventListener("change", (cb) => {
        document.querySelectorAll("input[name='mainImage']").forEach((x) => {
          if (x !== cb.target) x.checked = false;
        });
        state.mainImageName = cb.target.checked ? file.name : null;
      });
      preview.appendChild(card);
    };
    reader.readAsDataURL(file);
  });
}

const skeleton = (n = 6) =>
  Array.from({ length: n })
    .map(
      () => `
  <div class="relative rounded-xl overflow-hidden ring-1 ring-gray-200 bg-white">
    <div class="h-40 w-full tg-shimmer"></div>
  </div>`
    )
    .join("");

const empty = () => `
  <div class="col-span-full">
    <div class="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-xl py-8">
      <i data-lucide="image-off" class="h-5 w-5"></i><span>No images yet</span>
    </div>
  </div>`;

const err = (m) => `
  <div class="col-span-full">
    <div class="flex items-center justify-center gap-2 text-rose-600 bg-rose-50 border border-dashed border-rose-200 rounded-xl py-8">
      <i data-lucide="alert-triangle" class="h-5 w-5"></i><span>${m}</span>
    </div>
  </div>`;
