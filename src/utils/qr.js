// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * A QR code encoder that needs no library and sends
 * nothing to a QR service. Byte mode, error correction
 * level M, versions 1 to 20 (up to 666 bytes).
 *
 * The tables are those of ISO/IEC 18004 for level M. Each version's total
 * codewords and its blocks add up to the standard's totals
 * (tests/utils/qr.spec.js checks it).
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */

/** Total codewords per version, 1 to 20. */
export const TOTAL_CODEWORDS = [
	26,
	44,
	70,
	100,
	134,
	172,
	196,
	242,
	292,
	346,
	404,
	466,
	532,
	581,
	655,
	733,
	815,
	901,
	991,
	1085,
]

/** Level M per version: error correction codewords per block, then the blocks as [count, data codewords]. */
export const BLOCKS_M = [
	[10, [[1, 16]]],
	[16, [[1, 28]]],
	[26, [[1, 44]]],
	[18, [[2, 32]]],
	[24, [[2, 43]]],
	[16, [[4, 27]]],
	[18, [[4, 31]]],
	[
		22,
		[
			[2, 38],
			[2, 39],
		],
	],
	[
		22,
		[
			[3, 36],
			[2, 37],
		],
	],
	[
		26,
		[
			[4, 43],
			[1, 44],
		],
	],
	[
		30,
		[
			[1, 50],
			[4, 51],
		],
	],
	[
		22,
		[
			[6, 36],
			[2, 37],
		],
	],
	[
		22,
		[
			[8, 37],
			[1, 38],
		],
	],
	[
		24,
		[
			[4, 40],
			[5, 41],
		],
	],
	[
		24,
		[
			[5, 41],
			[5, 42],
		],
	],
	[
		28,
		[
			[7, 45],
			[3, 46],
		],
	],
	[
		28,
		[
			[10, 46],
			[1, 47],
		],
	],
	[
		26,
		[
			[9, 43],
			[4, 44],
		],
	],
	[
		26,
		[
			[3, 44],
			[11, 45],
		],
	],
	[
		26,
		[
			[3, 41],
			[13, 42],
		],
	],
]

/** Alignment pattern centres per version (version 1 has none). */
const ALIGNMENT = [
	[],
	[6, 18],
	[6, 22],
	[6, 26],
	[6, 30],
	[6, 34],
	[6, 22, 38],
	[6, 24, 42],
	[6, 26, 46],
	[6, 28, 50],
	[6, 30, 54],
	[6, 32, 58],
	[6, 34, 62],
	[6, 26, 46, 66],
	[6, 26, 48, 70],
	[6, 26, 50, 74],
	[6, 30, 54, 78],
	[6, 30, 56, 82],
	[6, 30, 58, 86],
	[6, 34, 62, 90],
]

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
	let x = 1
	for (let i = 0; i < 255; i++) {
		EXP[i] = x
		LOG[x] = i
		x <<= 1
		if (x & 0x100) {
			x ^= 0x11d
		}
	}
	for (let i = 255; i < 512; i++) {
		EXP[i] = EXP[i - 255]
	}
}

/**
 * Multiply in GF(256).
 *
 * @param {number} a A factor.
 * @param {number} b A factor.
 * @return {number} The product.
 */
function mul(a, b) {
	return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]
}

/**
 * The Reed-Solomon error correction codewords of a block.
 *
 * @param {Array<number>} data The block's data codewords.
 * @param {number} count How many error correction codewords.
 * @return {Array<number>} The error correction codewords.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function reedSolomon(data, count) {
	let generator = [1]
	for (let i = 0; i < count; i++) {
		const next = new Array(generator.length + 1).fill(0)
		for (let j = 0; j < generator.length; j++) {
			next[j] ^= generator[j]
			next[j + 1] ^= mul(generator[j], EXP[i])
		}
		generator = next
	}
	const remainder = new Array(count).fill(0)
	for (const byte of data) {
		const factor = byte ^ remainder[0]
		remainder.shift()
		remainder.push(0)
		for (let i = 0; i < count; i++) {
			remainder[i] ^= mul(generator[i + 1], factor)
		}
	}
	return remainder
}

/**
 * The 15 format bits for level M and a mask (BCH, XOR 0x5412).
 *
 * @param {number} mask The mask, 0 to 7.
 * @return {number} The bits.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function formatBits(mask) {
	const data = (0b00 << 3) | mask
	let rem = data
	for (let i = 0; i < 10; i++) {
		rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
	}
	return ((data << 10) | (rem & 0x3ff)) ^ 0x5412
}

/**
 * The 18 version bits of a version of 7 or more (BCH).
 *
 * @param {number} version The version.
 * @return {number} The bits.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function versionBits(version) {
	let rem = version
	for (let i = 0; i < 12; i++) {
		rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
	}
	return (version << 12) | (rem & 0xfff)
}

/**
 * The data codewords a version holds at level M.
 *
 * @param {number} version The version, 1 to 20.
 * @return {number} The count.
 */
function dataCodewords(version) {
	return BLOCKS_M[version - 1][1].reduce(
		(sum, [count, size]) => sum + count * size,
		0,
	)
}

/**
 * The most bytes a version holds in byte mode at level M.
 *
 * @param {number} version The version, 1 to 20.
 * @return {number} The capacity in bytes.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function byteCapacity(version) {
	const header = version < 10 ? 12 : 20
	return Math.floor((dataCodewords(version) * 8 - header) / 8)
}

/**
 * The modules that are not data: finders, separators, timing, alignment, the
 * dark module and the format and version areas.
 *
 * @param {number} version The version.
 * @return {Array<Array<boolean>>} True where a module is part of the pattern.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function functionModules(version) {
	const size = 17 + 4 * version
	const fixed = Array.from({ length: size }, () => new Array(size).fill(false))
	const mark = (r0, c0, h, w) => {
		for (let r = r0; r < r0 + h; r++) {
			for (let c = c0; c < c0 + w; c++) {
				if (r >= 0 && c >= 0 && r < size && c < size) {
					fixed[r][c] = true
				}
			}
		}
	}
	mark(0, 0, 9, 9)
	mark(0, size - 8, 9, 8)
	mark(size - 8, 0, 8, 9)
	mark(6, 0, 1, size)
	mark(0, 6, size, 1)
	const centres = ALIGNMENT[version - 1]
	for (const r of centres) {
		for (const c of centres) {
			const onFinder
				= (r === 6 && c === 6)
					|| (r === 6 && c === size - 7)
					|| (r === size - 7 && c === 6)
			if (!onFinder) {
				mark(r - 2, c - 2, 5, 5)
			}
		}
	}
	if (version >= 7) {
		mark(0, size - 11, 6, 3)
		mark(size - 11, 0, 3, 6)
	}
	return fixed
}

/**
 * The positions data bits go to, in reading order: two columns at a time from
 * the right, upwards then downwards, skipping the vertical timing column.
 *
 * @param {number} version The version.
 * @return {Array<[number, number]>} Row and column of each data module.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function dataPositions(version) {
	const size = 17 + 4 * version
	const fixed = functionModules(version)
	const out = []
	let upwards = true
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) {
			right = 5
		}
		for (let step = 0; step < size; step++) {
			const r = upwards ? size - 1 - step : step
			for (const c of [right, right - 1]) {
				if (!fixed[r][c]) {
					out.push([r, c])
				}
			}
		}
		upwards = !upwards
	}
	return out
}

/**
 * Whether a mask flips the module at a position.
 *
 * @param {number} mask The mask, 0 to 7.
 * @param {number} r The row.
 * @param {number} c The column.
 * @return {boolean} True when the module is flipped.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function masked(mask, r, c) {
	switch (mask) {
		case 0:
			return (r + c) % 2 === 0
		case 1:
			return r % 2 === 0
		case 2:
			return c % 3 === 0
		case 3:
			return (r + c) % 3 === 0
		case 4:
			return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
		case 5:
			return ((r * c) % 2) + ((r * c) % 3) === 0
		case 6:
			return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
		default:
			return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
	}
}

/**
 * The data and error correction codewords of a text, interleaved as the
 * symbol carries them.
 *
 * @param {Array<number>} bytes The text as UTF-8 bytes.
 * @param {number} version The version.
 * @return {Array<number>} The codewords.
 */
function codewords(bytes, version) {
	const capacity = dataCodewords(version)
	const bits = []
	const push = (value, length) => {
		for (let i = length - 1; i >= 0; i--) {
			bits.push((value >>> i) & 1)
		}
	}
	push(0b0100, 4)
	push(bytes.length, version < 10 ? 8 : 16)
	for (const byte of bytes) {
		push(byte, 8)
	}
	push(0, Math.min(4, capacity * 8 - bits.length))
	while (bits.length % 8 !== 0) {
		bits.push(0)
	}
	const data = []
	for (let i = 0; i < bits.length; i += 8) {
		data.push(parseInt(bits.slice(i, i + 8).join(''), 2))
	}
	for (let pad = 0; data.length < capacity; pad++) {
		data.push(pad % 2 === 0 ? 0xec : 0x11)
	}

	const [ecCount, groups] = BLOCKS_M[version - 1]
	const dataBlocks = []
	let at = 0
	for (const [count, size] of groups) {
		for (let i = 0; i < count; i++) {
			dataBlocks.push(data.slice(at, at + size))
			at += size
		}
	}
	const ecBlocks = dataBlocks.map((block) => reedSolomon(block, ecCount))
	const out = []
	const longest = Math.max(...dataBlocks.map((block) => block.length))
	for (let i = 0; i < longest; i++) {
		for (const block of dataBlocks) {
			if (i < block.length) {
				out.push(block[i])
			}
		}
	}
	for (let i = 0; i < ecCount; i++) {
		for (const block of ecBlocks) {
			out.push(block[i])
		}
	}
	return out
}

/**
 * Put the finder, timing, alignment, format and version patterns on a grid.
 *
 * @param {Array<Array<boolean>>} grid The modules to draw on.
 * @param {{version: number, mask: number}} symbol The version and the mask chosen.
 * @return {void}
 */
function drawPatterns(grid, { version, mask }) {
	const set = setterOf(grid)
	const size = grid.length
	drawFinder(set, [0, 0])
	drawFinder(set, [0, size - 7])
	drawFinder(set, [size - 7, 0])
	for (let i = 8; i < size - 8; i++) {
		set(6, i, i % 2 === 0)
		set(i, 6, i % 2 === 0)
	}
	drawAlignment(set, { version, size })
	set(size - 8, 8, true)
	drawFormat(set, { mask, size })
	if (version >= 7) {
		drawVersion(set, { version, size })
	}
}

/**
 * A setter of one module on a grid that ignores a module off the grid.
 *
 * @param {Array<Array<boolean>>} grid The modules to draw on.
 * @return {(r: number, c: number, dark: boolean) => void} The setter.
 */
function setterOf(grid) {
	const size = grid.length
	return (r, c, dark) => {
		if (r >= 0 && c >= 0 && r < size && c < size) {
			grid[r][c] = dark
		}
	}
}

/**
 * One finder pattern with its light separator.
 *
 * @param {(r: number, c: number, dark: boolean) => void} set The setter.
 * @param {[number, number]} corner The finder's top left module.
 * @return {void}
 */
function drawFinder(set, [r0, c0]) {
	for (let r = -1; r <= 7; r++) {
		for (let c = -1; c <= 7; c++) {
			const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3))
			set(r0 + r, c0 + c, r >= 0 && r <= 6 && c >= 0 && c <= 6 && ring !== 2)
		}
	}
}

/**
 * The alignment patterns of a version, except where a finder sits.
 *
 * @param {(r: number, c: number, dark: boolean) => void} set The setter.
 * @param {{version: number, size: number}} symbol The version and the symbol's size.
 * @return {void}
 */
function drawAlignment(set, { version, size }) {
	const centres = ALIGNMENT[version - 1]
	for (const r of centres) {
		for (const c of centres) {
			if (
				(r === 6 && c === 6)
				|| (r === 6 && c === size - 7)
				|| (r === size - 7 && c === 6)
			) {
				continue
			}
			for (let dr = -2; dr <= 2; dr++) {
				for (let dc = -2; dc <= 2; dc++) {
					set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1)
				}
			}
		}
	}
}

/**
 * The two copies of the format bits of a mask.
 *
 * @param {(r: number, c: number, dark: boolean) => void} set The setter.
 * @param {{mask: number, size: number}} symbol The mask and the symbol's size.
 * @return {void}
 */
function drawFormat(set, { mask, size }) {
	const format = formatBits(mask)
	for (let i = 0; i < 15; i++) {
		const dark = ((format >>> i) & 1) === 1
		// First copy: around the top left finder.
		if (i < 6) {
			set(i, 8, dark)
		} else if (i < 8) {
			set(i + 1, 8, dark)
		} else if (i === 8) {
			set(8, 7, dark)
		} else {
			set(8, 14 - i, dark)
		}
		// Second copy: beside the other two finders.
		if (i < 8) {
			set(8, size - 1 - i, dark)
		} else {
			set(size - 15 + i, 8, dark)
		}
	}
}

/**
 * The two copies of the version bits, from version 7 up.
 *
 * @param {(r: number, c: number, dark: boolean) => void} set The setter.
 * @param {{version: number, size: number}} symbol The version and the symbol's size.
 * @return {void}
 */
function drawVersion(set, { version, size }) {
	const bits = versionBits(version)
	for (let i = 0; i < 18; i++) {
		const dark = ((bits >>> i) & 1) === 1
		const a = Math.floor(i / 3)
		const b = (i % 3) + size - 11
		set(a, b, dark)
		set(b, a, dark)
	}
}

/**
 * The penalty of a symbol: the four rules of the standard. A lower one reads better.
 *
 * @param {Array<Array<boolean>>} grid The modules.
 * @return {number} The penalty.
 */
function penalty(grid) {
	const size = grid.length
	let score = 0
	const runs = (line) => {
		let total = 0
		let run = 1
		for (let i = 1; i < line.length; i++) {
			if (line[i] === line[i - 1]) {
				run++
			} else {
				total += run >= 5 ? run - 2 : 0
				run = 1
			}
		}
		return total + (run >= 5 ? run - 2 : 0)
	}
	const pattern = [true, false, true, true, true, false, true]
	const finderLike = (line) => {
		let total = 0
		for (let i = 0; i + 7 <= line.length; i++) {
			if (pattern.every((dark, k) => line[i + k] === dark)) {
				const before = line.slice(Math.max(0, i - 4), i)
				const after = line.slice(i + 7, i + 11)
				if (
					(before.length === 4 && before.every((v) => !v))
					|| (after.length === 4 && after.every((v) => !v))
				) {
					total += 40
				}
			}
		}
		return total
	}
	let dark = 0
	for (let r = 0; r < size; r++) {
		const row = grid[r]
		const column = grid.map((line) => line[r])
		score += runs(row) + runs(column) + finderLike(row) + finderLike(column)
		for (let c = 0; c < size; c++) {
			dark += row[c] ? 1 : 0
			if (
				r + 1 < size
				&& c + 1 < size
				&& row[c] === row[c + 1]
				&& row[c] === grid[r + 1][c]
				&& row[c] === grid[r + 1][c + 1]
			) {
				score += 3
			}
		}
	}
	const percent = (dark * 100) / (size * size)
	return score + Math.floor(Math.abs(percent - 50) / 5) * 10
}

/**
 * Encode a text as a QR code.
 *
 * @param {string} text The text, any Unicode.
 * @return {{version: number, size: number, modules: Array<Array<boolean>>}|null} The symbol, or null when the text is empty or too long for version 20.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export function encodeQr(text) {
	const bytes = Array.from(new TextEncoder().encode(String(text ?? '')))
	if (bytes.length === 0) {
		return null
	}
	let version = 1
	while (version <= 20 && byteCapacity(version) < bytes.length) {
		version++
	}
	if (version > 20) {
		return null
	}
	const words = codewords(bytes, version)
	const bits = words.flatMap((word) => Array.from({ length: 8 }, (_, i) => (word >>> (7 - i)) & 1))
	const positions = dataPositions(version)
	const size = 17 + 4 * version
	let best = null
	for (let mask = 0; mask < 8; mask++) {
		const grid = Array.from({ length: size }, () => new Array(size).fill(false))
		drawPatterns(grid, { version, mask })
		positions.forEach(([r, c], i) => {
			const bit = i < bits.length ? bits[i] === 1 : false
			grid[r][c] = masked(mask, r, c) ? !bit : bit
		})
		const score = penalty(grid)
		if (best === null || score < best.score) {
			best = { score, grid, mask }
		}
	}
	return { version, size, modules: best.grid }
}
