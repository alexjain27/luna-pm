/**
 * Darkens a hex color so that text rendered in that color on a white/near-white
 * background meets WCAG AA contrast (≥ 4.5:1). A darken factor of 0.48 reliably
 * achieves this for the saturated hues used in status badges.
 */
function darkenHex(hex: string, factor = 0.48): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
}

export function StatusBadge({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  const textColor = color.startsWith("#") ? darkenHex(color) : color;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color: textColor }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
