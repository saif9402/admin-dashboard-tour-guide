import { state } from "../core/state.js";
import { fetchTrips, setupHeaderSort, bindRowActions } from "./trips-table.js";
import { wireFilters } from "./trips-filters.js";
import {
  initialFormSetup,
  openAddTripModal,
  openEditTripModal,
  wireTabButtons,
} from "./trips-form.js";
import { wireImages } from "./trips-images.js";
import { wireReviews } from "./trips-reviews.js";

function onAuthReady() {
  // boot sequence
  Promise.resolve()
    .then(initialFormSetup)
    .then(() => {
      wireTabButtons();
      wireImages();
      wireReviews();
      wireFilters();
      setupHeaderSort();
      // page buttons
      document
        .getElementById("addTripBtn")
        ?.addEventListener("click", openAddTripModal);
      // table row actions
      bindRowActions({
        onAdd: openAddTripModal,
        onEdit: (id) => openEditTripModal(id),
        onDelete: async (id) => {
          const ok = await tgConfirm({
            title: "Delete this trip?",
            body: "This action cannot be undone.",
            confirmText: "Delete trip",
            cancelText: "Cancel",
            danger: true,
          });
          if (!ok) return;
          const { deleteTrip } = await import("../api/trips.js");
          const r = await deleteTrip(id);
          if (!r.ok || r.json?.succeeded === false) {
            tgToast({ variant: "error", message: "Failed to delete trip." });
            return;
          }
          tgToast({ variant: "success", message: "Trip deleted." });
          fetchTrips();
        },
      });
      // initial load
      fetchTrips();
    });
}

// run after auth guard
if (document.documentElement.getAttribute("data-auth") === "ready")
  onAuthReady();
else document.addEventListener("auth:ready", onAuthReady, { once: true });
