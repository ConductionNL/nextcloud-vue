// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// Reads a QR symbol back into text, for the tests of the encoder
// : a code that draws is not a code that says the right
// thing. It reads the format bits from both copies, undoes the mask, checks
// every block by its syndromes (a different route than the encoder's
// division) and parses byte mode.

import { BLOCKS_M, dataPositions, formatBits, masked } from '../../src/utils/qr.js'

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
 * Whether a block (data then error correction) is a codeword of the code:
 * the polynomial it makes is zero at every power of the generator root.
 *
 * @param {Array<number>} block The block.
 * @param {number} ecCount The number of error correction codewords.
 * @return {boolean} True when every syndrome is zero.
 */
function blockHolds(block, ecCount) {
	for (let root = 0; root < ecCount; root++) {
		let value = 0
		for (const word of block) {
			value = (value === 0 ? 0 : EXP[LOG[value] + root]) ^ word
		}
		if (value !== 0) {
			return false
		}
	}
	return true
}

/**
 * Read a symbol.
 *
 * @param {Array<Array<boolean>>} modules The modules, true for dark.
 * @return {{text: string, mask: number, version: number, blocksHold: boolean, copiesAgree: boolean}} What it says.
 */
export function decodeQr(modules) {
	const size = modules.length
	const version = (size - 17) / 4
	const at = (r, c) => (modules[r][c] ? 1 : 0)
	const first = []
	const second = []
	for (let i = 0; i < 15; i++) {
		const [r1, c1] = i < 6 ? [i, 8] : i < 8 ? [i + 1, 8] : i === 8 ? [8, 7] : [8, 14 - i]
		const [r2, c2] = i < 8 ? [8, size - 1 - i] : [size - 15 + i, 8]
		first.push(at(r1, c1))
		second.push(at(r2, c2))
	}
	const read = (bits) => bits.reduce((sum, bit, i) => sum | (bit << i), 0)
	const mask = [0, 1, 2, 3, 4, 5, 6, 7].find((candidate) => formatBits(candidate) === read(first))
	const copiesAgree = read(first) === read(second)
	if (mask === undefined) {
		throw new Error('the format bits name no mask')
	}
	const bits = dataPositions(version).map(([r, c]) => at(r, c) ^ (masked(mask, r, c) ? 1 : 0))
	const words = []
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		words.push(parseInt(bits.slice(i, i + 8).join(''), 2))
	}

	const [ecCount, groups] = BLOCKS_M[version - 1]
	const sizes = groups.flatMap(([count, data]) => new Array(count).fill(data))
	const blocks = sizes.map(() => [])
	let at2 = 0
	const longest = Math.max(...sizes)
	for (let i = 0; i < longest; i++) {
		sizes.forEach((size2, b) => {
			if (i < size2) {
				blocks[b].push(words[at2++])
			}
		})
	}
	const ec = sizes.map(() => [])
	for (let i = 0; i < ecCount; i++) {
		sizes.forEach((_, b) => ec[b].push(words[at2++]))
	}
	const blocksHold = blocks.every((data, b) => blockHolds([...data, ...ec[b]], ecCount))

	const data = blocks.flat()
	const stream = data.map((word) => word.toString(2).padStart(8, '0')).join('')
	if (stream.slice(0, 4) !== '0100') {
		throw new Error('not byte mode')
	}
	const countBits = version < 10 ? 8 : 16
	const length = parseInt(stream.slice(4, 4 + countBits), 2)
	const bytes = []
	for (let i = 0; i < length; i++) {
		const from = 4 + countBits + i * 8
		bytes.push(parseInt(stream.slice(from, from + 8), 2))
	}
	return { text: new TextDecoder().decode(new Uint8Array(bytes)), mask, version, blocksHold, copiesAgree }
}
