(function () {
  const VARIANTS = {
    success: {
      ring: "ring-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      icon: "check-circle-2",
    },
    error: {
      ring: "ring-rose-200",
      bg: "bg-rose-50",
      text: "text-rose-800",
      icon: "x-circle",
    },
    warning: {
      ring: "ring-amber-200",
      bg: "bg-amber-50",
      text: "text-amber-800",
      icon: "alert-triangle",
    },
    info: {
      ring: "ring-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-800",
      icon: "info",
    },
  };

  function ensureToastRoot() {
    let el = document.getElementById("toast-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-root";
      el.className =
        "fixed z-[70] top-4 right-4 w-[calc(100vw-2rem)] max-w-sm space-y-3 pointer-events-none";
      document.body.appendChild(el);
    }
    return el;
  }

  function closeToast(card) {
    if (!card) return;
    card.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => card.remove(), 150);
  }

  window.tgToast = function ({
    title = "",
    message = "",
    variant = "info",
    duration = 3500,
  } = {}) {
    const v = VARIANTS[variant] || VARIANTS.info;
    const root = ensureToastRoot();

    const card = document.createElement("div");
    card.role = "alert";
    card.className = [
      "pointer-events-auto flex items-start gap-3 rounded-xl p-3 ring-1 shadow-lg transition",
      v.bg,
      v.text,
      v.ring,
      "opacity-0 translate-y-2",
    ].join(" ");

    card.innerHTML = `
      <div class="shrink-0">
        <i data-lucide="${v.icon}" class="h-5 w-5"></i>
      </div>
      <div class="min-w-0">
        ${title ? `<div class="text-sm font-semibold">${title}</div>` : ""}
        <div class="text-sm">${message}</div>
      </div>
      <button type="button" aria-label="Close"
        class="ml-auto rounded-lg p-1 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2">
        <i data-lucide="x" class="h-4 w-4"></i>
      </button>
    `;

    const kill = () => closeToast(card);
    card.querySelector("button").addEventListener("click", kill);

    root.appendChild(card);
    // animate in
    requestAnimationFrame(() => {
      card.classList.remove("opacity-0", "translate-y-2");
    });

    // pause on hover
    let timer = null;
    let remaining = duration;
    let started = Date.now();
    const start = () => {
      started = Date.now();
      timer = setTimeout(kill, remaining);
    };
    const pause = () => {
      clearTimeout(timer);
      remaining -= Date.now() - started;
    };
    if (duration > 0) start();
    card.addEventListener("mouseenter", pause);
    card.addEventListener("mouseleave", () => {
      if (duration > 0) start();
    });

    if (window.lucide?.createIcons) lucide.createIcons();
    return card;
  };

  window.tgConfirm = function ({
    title = "Are you sure?",
    body = "",
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false,
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className =
        "fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm opacity-0 transition-opacity";
      const panel = document.createElement("div");
      panel.className =
        "fixed inset-0 z-[81] flex items-center justify-center p-4";

      const panelInner = document.createElement("div");
      panelInner.className =
        "w-full max-w-md rounded-2xl bg-white ring-1 ring-black/5 shadow-2xl opacity-0 translate-y-4 scale-95 transition";
      panelInner.innerHTML = `
        <div class="px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
          <div class="flex items-center gap-2">
            <i data-lucide="${
              danger ? "shield-alert" : "help-circle"
            }" class="h-5 w-5"></i>
            <h3 class="text-base font-semibold">${title}</h3>
          </div>
        </div>
        <div class="px-5 py-4 text-gray-700">
          <p class="text-sm whitespace-pre-line">${body}</p>
        </div>
        <div class="px-5 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-end gap-2">
          <button type="button" class="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100"> ${cancelText} </button>
          <button type="button" class="px-4 py-2 rounded-xl text-white ${
            danger
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-blue-600 hover:bg-blue-700"
          }"> ${confirmText} </button>
        </div>
      `;

      document.body.appendChild(overlay);
      panel.appendChild(panelInner);
      document.body.appendChild(panel);

      // animate in
      requestAnimationFrame(() => {
        overlay.classList.remove("opacity-0");
        panelInner.classList.remove("opacity-0", "translate-y-4", "scale-95");
      });

      const [btnCancel, btnOk] = panelInner.querySelectorAll("button");
      const cleanup = () => {
        overlay.classList.add("opacity-0");
        panelInner.classList.add("opacity-0", "translate-y-4", "scale-95");
        setTimeout(() => {
          overlay.remove();
          panel.remove();
        }, 150);
        document.removeEventListener("keydown", onKey);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(false);
        }
        if (e.key === "Enter") {
          cleanup();
          resolve(true);
        }
      };

      btnCancel.addEventListener("click", () => {
        cleanup();
        resolve(false);
      });
      btnOk.addEventListener("click", () => {
        cleanup();
        resolve(true);
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
      document.addEventListener("keydown", onKey);

      // focus
      btnOk.focus();
      if (window.lucide?.createIcons) lucide.createIcons();
    });
  };
})();
