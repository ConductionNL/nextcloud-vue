/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every matrix level's ink reaches 4.5:1 on its ground under Nextcloud's
 * default light and dark tokens. Level 3 (the primary at 65% over the main
 * background) drew white text at about 2.9:1. Read from the component text;
 * `color-mix(in srgb, A P%, B)` is evaluated on the token values below.
 *
 * @spec openspec/changes/matrix-level3-contrast/specs/matrix-level3-contrast/spec.md#requirement-a-matrix-cell-keeps-a-readable-ink
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnChartWidget/CnChartWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const THEMES = {
	light: {
		'--color-primary-element': '#00679e',
		'--color-primary-element-text': '#ffffff',
		'--color-primary-element-light': '#e5f0f5',
		'--color-primary-element-light-text': '#00293f',
		'--color-main-background': '#ffffff',
		'--color-main-text': '#222222',
	},
	dark: {
		'--color-primary-element': '#0091f2',
		'--color-primary-element-text': '#000000',
		'--color-primary-element-light': '#0f2a3b',
		'--color-primary-element-light-text': '#bfe4ff',
		'--color-main-background': '#171717',
		'--color-main-text': '#ebebeb',
	},
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/**
 * Resolve a `var(--x)` or `color-mix(in srgb, var(--a) P%, var(--b))` value.
 *
 * @param {string} value The declared value.
 * @param {object} tokens The token values.
 * @return {number[]} The rgb triple.
 */
function resolve(value, tokens) {
	const mix = value.match(/color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)/)
	if (mix) {
		const a = hex(tokens[mix[1]])
		const b = hex(tokens[mix[3]])
		const p = Number(mix[2]) / 100
		return a.map((v, i) => v * p + b[i] * (1 - p))
	}
	return hex(tokens[value.match(/var\((--[\w-]+)\)/)[1]])
}

function luminance(rgb) {
	const [r, g, b] = rgb.map((v) => {
		const c = v / 255
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi + 0.05) / (lo + 0.05)
}

/**
 * The declarations of one level's rule.
 *
 * @param {number} level The level.
 * @return {{background: string, color: string}} The two values.
 */
function levelRule(level) {
	const at = source.indexOf(`.cn-chart-widget__matrix-cell--${level} {`)
	const body = source.slice(at, source.indexOf('}', at))
	return {
		background: body.match(/\n\tbackground: ([^;]+);/)[1],
		color: body.match(/\n\tcolor: ([^;]+);/)[1],
	}
}

describe('CnChartWidget matrix: every level is readable', () => {
	for (const [theme, tokens] of Object.entries(THEMES)) {
		for (const level of [1, 2, 3, 4]) {
			it(`level ${level} reaches 4.5:1 in the ${theme} theme`, () => {
				const rule = levelRule(level)
				expect(contrast(resolve(rule.background, tokens), resolve(rule.color, tokens))).toBeGreaterThanOrEqual(4.5)
			})
		}
	}

	it('hands level 3 its dark ink under a theme that forces span ink', () => {
		const at = source.indexOf('.cn-chart-widget__matrix-cell--3 {')
		expect(source.slice(at, source.indexOf('}', at))).toContain('--nldesign-color-on-surface: var(--color-main-text)')
	})
})
