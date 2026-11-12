/**
 * Dependency-free QR Code encoder (ISO/IEC 18004), byte mode.
 *
 * Phone cameras read QR, not Code 128, and a QR symbol holds enough for the
 * whole order record rather than just its id — so job cards encode a full
 * text payload here.
 *
 * Versions 1–40, all four error-correction levels, automatic version and mask
 * selection. Output is a boolean matrix; `components/QrCode.tsx` renders it.
 */

export type EccLevel = "L" | "M" | "Q" | "H";

export interface QrMatrix {
  /** Modules per side, excluding the quiet zone. */
  size: number;
  /** `modules[y][x]` — true is a dark module. */
  modules: boolean[][];
  version: number;
  ecl: EccLevel;
}

/** Error-correction codewords per block, indexed [ecl][version]. */
const ECC_CODEWORDS_PER_BLOCK: Record<EccLevel, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

/** Number of error-correction blocks, indexed [ecl][version]. */
const NUM_ECC_BLOCKS: Record<EccLevel, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** Format-information bits for each level (not the same order as L/M/Q/H). */
const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

/** Total data + ECC modules for a version, i.e. everything but function patterns. */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number, ecl: EccLevel): number {
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][version] * NUM_ECC_BLOCKS[ecl][version]
  );
}

/** Centre coordinates of the alignment patterns for a version. */
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step =
    version === 32
      ? 26
      : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

// ---------------------------------------------------------------------------
// GF(256) arithmetic for Reed-Solomon, modulo x^8 + x^4 + x^3 + x^2 + 1.

function gfMultiply(a: number, b: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((b >>> i) & 1) * a;
  }
  return z & 0xff;
}

/** Coefficients of the RS generator polynomial of the given degree. */
function rsGenerator(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], generator: number[]): number[] {
  const result = new Array<number>(generator.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < generator.length; i++) {
      result[i] ^= gfMultiply(generator[i], factor);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------

class BitBuffer {
  readonly bits: number[] = [];

  append(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }
}

/** Byte-mode character-count indicator width. */
function charCountBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

function smallestVersion(byteLength: number, ecl: EccLevel): number {
  for (let version = 1; version <= 40; version++) {
    const capacity = dataCodewords(version, ecl) * 8;
    if (4 + charCountBits(version) + byteLength * 8 <= capacity) return version;
  }
  throw new Error("Data too long for a QR code");
}

/** Interleave the data and ECC blocks into the final codeword sequence. */
function addEcc(data: number[], version: number, ecl: EccLevel): number[] {
  const numBlocks = NUM_ECC_BLOCKS[ecl][version];
  const eccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortLength = Math.floor(rawCodewords / numBlocks) - eccLen;

  const generator = rsGenerator(eccLen);
  const blocks: number[][] = [];
  const eccBlocks: number[][] = [];

  for (let i = 0, k = 0; i < numBlocks; i++) {
    const length = shortLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(k, k + length);
    k += length;
    blocks.push(block);
    eccBlocks.push(rsRemainder(block, generator));
  }

  const result: number[] = [];
  for (let i = 0; i < shortLength + 1; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocks[b].length) result.push(blocks[b][i]);
    }
  }
  for (let i = 0; i < eccLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      result.push(eccBlocks[b][i]);
    }
  }
  return result;
}

class Symbol_ {
  readonly version: number;
  readonly ecl: EccLevel;
  readonly size: number;
  readonly modules: boolean[][];
  readonly isFunction: boolean[][];

  constructor(version: number, ecl: EccLevel) {
    this.version = version;
    this.ecl = ecl;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
    this.isFunction = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
  }

  private set(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  private finder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.set(x, y, dist !== 2 && dist !== 4);
      }
    }
  }

  drawFunctionPatterns(): void {
    // Timing patterns.
    for (let i = 0; i < this.size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }

    this.finder(3, 3);
    this.finder(this.size - 4, 3);
    this.finder(3, this.size - 4);

    // Alignment patterns, skipping the three finder corners.
    const positions = alignmentPositions(this.version);
    const last = positions.length - 1;
    for (let i = 0; i <= last; i++) {
      for (let j = 0; j <= last; j++) {
        const corner =
          (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
        if (corner) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            this.set(
              positions[j] + dx,
              positions[i] + dy,
              Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
            );
          }
        }
      }
    }

    // Reserve the format/version areas; real values are written later.
    this.drawFormatBits(0);
    this.drawVersionBits();
  }

  drawFormatBits(mask: number): void {
    const data = (ECC_FORMAT_BITS[this.ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    const bit = (i: number) => ((bits >>> i) & 1) !== 0;

    for (let i = 0; i <= 5; i++) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i++) this.set(this.size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.set(8, this.size - 15 + i, bit(i));
    this.set(8, this.size - 8, true); // Always-dark module.
  }

  private drawVersionBits(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;

    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  /** Zigzag placement of the codeword bit stream. */
  drawCodewords(codewords: number[]): void {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // Skip the vertical timing column.
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (this.isFunction[y][x] || i >= codewords.length * 8) continue;
          this.modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }

  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  /** The four standard penalty rules; lower is better. */
  penalty(): number {
    let result = 0;
    const size = this.size;

    // Rule 1 — runs of five or more same-coloured modules in a line.
    for (const horizontal of [true, false]) {
      for (let a = 0; a < size; a++) {
        let runColor = false;
        let runLength = 0;
        const history = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < size; b++) {
          const dark = horizontal ? this.modules[a][b] : this.modules[b][a];
          if (dark === runColor) {
            runLength++;
            if (runLength === 5) result += PENALTY_N1;
            else if (runLength > 5) result++;
          } else {
            this.pushRun(runLength, history);
            if (!runColor) result += this.finderPenalty(history) * PENALTY_N3;
            runColor = dark;
            runLength = 1;
          }
        }
        result +=
          this.terminateAndCount(runColor, runLength, history) * PENALTY_N3;
      }
    }

    // Rule 2 — 2x2 blocks of one colour.
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = this.modules[y][x];
        if (
          c === this.modules[y][x + 1] &&
          c === this.modules[y + 1][x] &&
          c === this.modules[y + 1][x + 1]
        ) {
          result += PENALTY_N2;
        }
      }
    }

    // Rule 4 — deviation of dark module ratio from 50%.
    let dark = 0;
    for (const row of this.modules) for (const m of row) if (m) dark++;
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * PENALTY_N4;

    return result;
  }

  private pushRun(runLength: number, history: number[]): void {
    if (history[0] === 0) history[0] = this.size; // Add light border to the first run.
    history.pop();
    history.unshift(runLength);
  }

  /** How many 1:1:3:1:1 finder-like patterns end at this history window. */
  private finderPenalty(history: number[]): number {
    const n = history[1];
    const core =
      n > 0 &&
      history[2] === n &&
      history[3] === n * 3 &&
      history[4] === n &&
      history[5] === n;
    return (
      (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
      (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
    );
  }

  private terminateAndCount(
    runColor: boolean,
    runLength: number,
    history: number[],
  ): number {
    let length = runLength;
    if (runColor) {
      this.pushRun(length, history);
      length = 0;
    }
    length += this.size; // Add light border to the final run.
    this.pushRun(length, history);
    return this.finderPenalty(history);
  }
}

/**
 * Encodes `text` (UTF-8, byte mode) as a QR symbol.
 * Picks the smallest version that fits and the lowest-penalty mask.
 */
export function encodeQr(text: string, ecl: EccLevel = "M"): QrMatrix {
  if (!text) throw new Error("QR payload must not be empty");

  const bytes = Array.from(new TextEncoder().encode(text));
  const version = smallestVersion(bytes.length, ecl);

  const bb = new BitBuffer();
  bb.append(0b0100, 4); // Byte mode.
  bb.append(bytes.length, charCountBits(version));
  for (const b of bytes) bb.append(b, 8);

  const capacity = dataCodewords(version, ecl) * 8;
  bb.append(0, Math.min(4, capacity - bb.bits.length)); // Terminator.
  bb.append(0, (8 - (bb.bits.length % 8)) % 8); // Pad to a byte boundary.
  for (let pad = 0xec; bb.bits.length < capacity; pad ^= 0xec ^ 0x11) {
    bb.append(pad, 8);
  }

  const data: number[] = [];
  for (let i = 0; i < bb.bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
    data.push(byte);
  }

  const codewords = addEcc(data, version, ecl);

  const symbol = new Symbol_(version, ecl);
  symbol.drawFunctionPatterns();
  symbol.drawCodewords(codewords);

  // Try every mask, keep the one with the lowest penalty.
  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    symbol.applyMask(mask);
    symbol.drawFormatBits(mask);
    const p = symbol.penalty();
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = mask;
    }
    symbol.applyMask(mask); // Undo — masking is its own inverse.
  }
  symbol.applyMask(bestMask);
  symbol.drawFormatBits(bestMask);

  return {
    size: symbol.size,
    modules: symbol.modules,
    version,
    ecl,
  };
}
