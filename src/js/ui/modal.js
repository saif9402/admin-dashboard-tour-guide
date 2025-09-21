import { $ } from "../core/dom.js";
import { state } from "../core/state.js";

function trapTab(e) {
  if (e.key !== "Tab") return;
  const panel = $("#tripModalPanel");
  const focusables = panel.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0],
    last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
}

export function openModal() {
  const modal = $("#tripModal"),
    overlay = $("#tripModalOverlay"),
    panel = $("#tripModalPanel");
  state.lastFocusedEl = document.activeElement;
  modal.classList.remove("hidden");
  requestAnimationFrame(() => {
    overlay.classList.remove("opacity-0");
    panel.classList.remove("opacity-0", "translate-y-6", "scale-95");
    const first = panel.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  });
  document.addEventListener("keydown", onEscClose);
  document.addEventListener("keydown", trapTab);
}

export function closeModal() {
  const modal = $("#tripModal"),
    overlay = $("#tripModalOverlay"),
    panel = $("#tripModalPanel");
  overlay.classList.add("opacity-0");
  panel.classList.add("opacity-0", "translate-y-6", "scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    state.lastFocusedEl?.focus?.();
  }, 200);
  document.removeEventListener("keydown", onEscClose);
  document.removeEventListener("keydown", trapTab);
}

function onEscClose(e) {
  if (e.key === "Escape") closeModal();
}

// overlay click
document.addEventListener("click", (e) => {
  if (e.target === $("#tripModalOverlay")) closeModal();
});
