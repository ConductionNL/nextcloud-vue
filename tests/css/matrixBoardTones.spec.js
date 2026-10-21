/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The matrix levels draw the board's four tones under the Zuiddrecht set
 * (DqProcesanalyse "Dagen per fase"): #eaf0f7, #b9cde3, #6f95c4 and #234a78.
 * Level 3 keeps its dark ink, as white on the board's #6f95c4 is about
 * 3.1:1. Read from the component text; `color-mix(in srgb, A P%, B)` is
 * evaluated on the token values below.
 *
 * @spec openspec/changes/board-matrix-tones/specs/board-matrix-tones/spec.md#requirement-a-matrix-draws-the-boards-four-tones
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnChartWidget/CnChartWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ZUIDDRECHT = {
	'--color-primary-element': '#3669a5',
	'--color-primary-element-text': '#ffffff',
	'--color-primary-element-light': '#eaf0f7',
	'--color-primary-element-light-text': '#234a78',
	'--color-main-background': '#ffffff',
	'--color-main-text': '#1b1c1d',
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/**
 * Resolve a `var(--x)` or `color-mix(in srgb, var(--a) P%, var(--b))` value.
 *
 * @param {string} value The declared value.
 * @return {number[]} The rgb triple.
 */
function resolve(value) {
	const mix = value.match(/color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)/)
	if (mix) {
		const a = hex(ZUIDDRECHT[mix[1]])
		const b = hex(ZUIDDRECHT[mix[3]])
		const p = Number(mix[2]) / 100
		return a.map((v, i) => v * p + b[i] * (1 - p))
	}
	return hex(ZUIDDRECHT[value.match(/var\((--[\w-]+)\)/)[1]])
}

/**
 * The declarations of one level's rule.
 *
 * @param {number} level The level.
 * @return {string} The rule body.
 */
function levelBody(level) {
	const at = source.indexOf(`.cn-chart-widget__matrix-cell--${level} {`)
	return source.slice(at, source.indexOf('}', at))
}

const background = (level) => resolve(levelBody(level).match(/\n\tbackground: ([^;]+);/)[1])

/**
 * The largest channel difference between two colours.
 *
 * @param {number[]} a One rgb triple.
 * @param {number[]} b The other.
 * @return {number} The difference.
 */
const distance = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])))

describe('CnChartWidget matrix: the board tones', () => {
	const tones = { 1: '#eaf0f7', 2: '#b9cde3', 3: '#6f95c4', 4: '#234a78' }
	for (const [level, tone] of Object.entries(tones)) {
		it(`level ${level} draws ${tone} within 6 per channel`, () => {
			expect(distance(background(Number(level)), hex(tone))).toBeLessThanOrEqual(6)
		})
	}

	it('inverts level 1 on level 4, also as the theme\'s on-surface ink', () => {
		const body = levelBody(4)
		expect(body).toMatch(/\n\tbackground: var\(--color-primary-element-light-text\);/)
		expect(body).toMatch(/\n\tcolor: var\(--color-primary-element-light\);/)
		expect(body).toMatch(/--nldesign-color-on-surface: var\(--color-primary-element-light\);/)
	})
})
