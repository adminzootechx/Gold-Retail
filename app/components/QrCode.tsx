import { encodeQr, type EccLevel } from "../lib/qrcode";

/** Modules of clear margin required either side of the symbol by the spec. */
const QUIET_ZONE = 4;

/**
 * Smallest square, in CSS pixels. Below about 3 px a phone camera — and a
 * printed tag — stops reading a dense code, so a long payload makes the
 * symbol bigger than `size` rather than smaller squares.
 */
const MIN_MODULE_PX = 3;

/**
 * Renders `value` as a scannable QR code.
 * Pure SVG so it prints cleanly and needs no client JS.
 */
export default function QrCode({
  value,
  size = 220,
  ecl = "M",
  className = "",
}: {
  value: string;
  /** Rendered edge length in px, excluding nothing — the quiet zone is inside. */
  size?: number;
  ecl?: EccLevel;
  className?: string;
}) {
  let qr;
  try {
    qr = encodeQr(value, ecl);
  } catch {
    return (
      <p className="text-[11px] text-danger font-tabular">
        Cannot encode this payload
      </p>
    );
  }

  const span = qr.size + QUIET_ZONE * 2;
  // Whole pixels per square, so every square prints the same size.
  const edge = span * Math.max(MIN_MODULE_PX, Math.round(size / span));

  // One path for every dark module keeps the markup small at high versions.
  let path = "";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) {
        path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${span} ${span}`}
      width={edge}
      height={edge}
      style={{ maxWidth: "none" }}
      role="img"
      aria-label={`QR code: ${value.split("\n")[0]}`}
      shapeRendering="crispEdges"
    >
      <rect width={span} height={span} fill="#ffffff" />
      <path d={path} fill="#0F172A" />
    </svg>
  );
}
