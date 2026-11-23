/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The learniq Today tiles draw the icon in a 42px circle above the label, a
 * 22px glyph, 10px over the label (LqTlVandaag). jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-stat-tile-icon-top/specs/stat-tile-board-look/spec.md#requirement-a-board-stat-tile-can-carry-its-icon-in-a-circle-above-the-label
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/kpi-card.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('kpi-card.css: the icon circle above the label', () => {
	it('is 42px, not pushed to the end, 10px over the label', () => {
		const body = ruleFor('.cn-kpi-card__badge--top')
		expect(body).toContain('width: 42px;')
		expect(body).toContain('height: 42px;')
		expect(body).toContain('margin-inline-start: 0;')
		expect(body).toContain('margin-block-end: calc(10px - var(--cn-kpi-stacked-gap, 6px));')
	})

	it('draws a 22px glyph', () => {
		const body = ruleFor('.cn-kpi-card__badge--top svg')
		expect(body).toContain('width: 22px;')
		expect(body).toContain('height: 22px;')
	})

	it('leaves the 32px end circle as it is', () => {
		const body = ruleFor('.cn-kpi-card__badge')
		expect(body).toContain('width: 32px;')
		expect(body).toContain('margin-inline-start: auto;')
	})
})
