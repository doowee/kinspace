// Deterministic color palette for studio badges
// Uses HSL-based semantic-friendly colors that work in light & dark mode

const STUDIO_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-700" },
  { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700" },
  { bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-300 dark:border-violet-700" },
  { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-700" },
  { bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-300 dark:border-rose-700" },
  { bg: "bg-cyan-100 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-300 dark:border-cyan-700" },
  { bg: "bg-pink-100 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300 dark:border-pink-700" },
  { bg: "bg-teal-100 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-300 dark:border-teal-700" },
];

/**
 * Returns a deterministic color set for a studio ID.
 * Consistent across renders — same ID always gets same color.
 */
export function getStudioColor(studioId: string) {
  let hash = 0;
  for (let i = 0; i < studioId.length; i++) {
    hash = ((hash << 5) - hash + studioId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % STUDIO_COLORS.length;
  return STUDIO_COLORS[index];
}

/**
 * Returns combined className string for a studio badge.
 */
export function studioColorClass(studioId: string) {
  const c = getStudioColor(studioId);
  return `${c.bg} ${c.text} ${c.border}`;
}
