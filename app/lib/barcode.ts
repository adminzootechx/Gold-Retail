/**
 * Minimal Code 128-B encoder.
 *
 * Order IDs in this app (e.g. "SO-4821") are plain ASCII, so subset B alone
 * covers them. Kept dependency-free so the barcode renders identically on the
 * server and the client with no hydration mismatch.
 */

/**
 * Bar/space module widths for Code 128 symbols 0–106.
 * Each entry alternates bar, space, bar, space, … starting with a bar.
 * Symbols 0–105 are 11 modules wide; 106 (STOP) is 13.
 */
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213",
  "122312", "132212", "221213", "221312", "231212", "112232", "122132",
  "122231", "113222", "123122", "123221", "223211", "221132", "221231",
  "213212", "223112", "312131", "311222", "321122", "321221", "312212",
  "322112", "322211", "212123", "212321", "232121", "111323", "131123",
  "131321", "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121", "313121",
  "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114",
  "413111", "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141", "214121",
  "412121", "111143", "111341", "131141", "114113", "114311", "411113",
  "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "2331112",
];

/** Subset-B start symbol. */
const START_B = 104;
const STOP = 106;

/** A single bar in the rendered symbol, in module units from the left edge. */
export interface BarcodeBar {
  x: number;
  width: number;
}

export interface EncodedBarcode {
  bars: BarcodeBar[];
  /** Total width of the symbol in modules, quiet zones excluded. */
  modules: number;
}

/** Code 128-B covers ASCII 32–126. */
function isEncodable(value: string): boolean {
  return [...value].every((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });
}

/**
 * Encodes `value` as Code 128-B and returns the bars to draw.
 * Throws on characters outside the subset rather than emitting a symbol that
 * would scan as the wrong string.
 */
export function encodeCode128(value: string): EncodedBarcode {
  if (!value) throw new Error("Barcode value must not be empty");
  if (!isEncodable(value)) {
    throw new Error(`Value contains characters outside Code 128-B: ${value}`);
  }

  // Symbol values: START_B, one per character, checksum, STOP.
  const symbols = [START_B, ...[...value].map((c) => c.charCodeAt(0) - 32)];

  // Checksum is the start value plus each data value weighted by position.
  let sum = START_B;
  for (let i = 1; i < symbols.length; i++) sum += symbols[i] * i;
  symbols.push(sum % 103, STOP);

  const bars: BarcodeBar[] = [];
  let x = 0;

  for (const symbol of symbols) {
    const pattern = PATTERNS[symbol];
    for (let i = 0; i < pattern.length; i++) {
      const width = Number(pattern[i]);
      // Even indices are bars, odd are spaces.
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
  }

  return { bars, modules: x };
}
