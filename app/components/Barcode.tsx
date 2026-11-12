import { encodeCode128 } from "../lib/barcode";

/** Quiet zone required either side of a Code 128 symbol, in modules. */
const QUIET_ZONE = 10;

/**
 * Narrowest bar, in CSS pixels. Bars are drawn at whole pixels and never
 * scaled to fit a box: a scaled barcode ends up with bars of uneven width
 * (1 px here, 2 px there) and scanners stop reading it.
 */
const MODULE_PX = 2;

/**
 * Renders `value` as a scannable Code 128-B barcode.
 * Pure SVG so it prints cleanly and needs no client JS.
 */
export default function Barcode({
  value,
  height = 56,
  showText = true,
  className = "",
  moduleWidth = MODULE_PX,
}: {
  value: string;
  /** Bar height in px. The width follows from the value: it is never scaled to fit. */
  height?: number;
  showText?: boolean;
  className?: string;
  /** Width of the narrowest bar in px (whole pixels only). */
  moduleWidth?: number;
}) {
  let encoded;
  try {
    encoded = encodeCode128(value);
  } catch {
    return (
      <p className="text-[11px] text-danger font-tabular">
        Cannot encode “{value}”
      </p>
    );
  }

  const totalWidth = encoded.modules + QUIET_ZONE * 2;
  const totalHeight = height;

  return (
    <div className={`inline-block bg-white ${className}`}>
      <svg
      className="block"
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={totalWidth * Math.max(1, Math.round(moduleWidth))}
      height={totalHeight}
      preserveAspectRatio="none"
      style={{ maxWidth: "none" }}
      role="img"
      aria-label={`Barcode for ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={totalWidth} height={totalHeight} fill="#ffffff" />
      {encoded.bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x + QUIET_ZONE}
          y={0}
          width={bar.width}
          height={height}
          fill="#0F172A"
        />
      ))}
    </svg>
      {showText && (
        <p className="mt-1 text-center font-mono text-[11px] tracking-[0.15em] text-[#0F172A]">{value}</p>
      )}
    </div>
  );
}
