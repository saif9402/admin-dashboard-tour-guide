export const badge = (text, color = "blue") => {
  const cls =
    {
      blue: "bg-blue-50 text-blue-700 ring-blue-100",
      gray: "bg-gray-50 text-gray-700 ring-gray-100",
      green: "bg-green-50 text-green-700 ring-green-100",
      red: "bg-rose-50 text-rose-700 ring-rose-100",
      amber: "bg-amber-50 text-amber-700 ring-amber-100",
      violet: "bg-violet-50 text-violet-700 ring-violet-100",
    }[color] || "bg-gray-50 text-gray-700 ring-gray-100";
  return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${cls}">${text}</span>`;
};

export const availabilityBadge = (val) =>
  val
    ? `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 bg-emerald-50 text-emerald-700 ring-emerald-100">
         <i data-lucide="check-circle-2" class="h-3.5 w-3.5"></i> Yes
       </span>`
    : `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 bg-rose-50 text-rose-700 ring-rose-100">
         <i data-lucide="x-circle" class="h-3.5 w-3.5"></i> No
       </span>`;

export const durationPill = (m) =>
  `<span class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-gray-200 bg-gray-50 text-gray-700">
     <i data-lucide="clock-3" class="h-3.5 w-3.5"></i>${m}m
   </span>`;

export const initialBubble = (name) => {
  const ch = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return `<span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-700 font-semibold ring-1 ring-indigo-200">${ch}</span>`;
};
