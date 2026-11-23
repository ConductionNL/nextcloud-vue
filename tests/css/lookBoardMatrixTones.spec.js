/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board matrix's toned cells take the theme's status badge grounds
 * (DqHandhaving). jsdom draws no layout, so the rules are read from the text.
 *
 * @spec openspec/changes/board-matrix-tones/specs/board-matrix-tones/spec.md#requirement-a-board-matrix-cell-takes-the-themes-status-grounds
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

const cell = (tone) => `.cn-look-board .cn-chart-widget__matrix:not(.cn-look-nextcloud *) .cn-chart-widget__matrix-cell--${tone}`

describe('look-board.css: matrix tones', () => {
	it.each(['success', 'warning', 'error'])('a %s cell takes the theme status badge ground', (tone) => {
		expect(ruleFor(cell(tone))).toContain(`var(--nldesign-component-status-badge-${tone}-background-color,`)
	})

	it('a danger cell takes its own token, else deepens the error ground', () => {
		const body = ruleFor(cell('danger'))
		expect(body).toContain('var(--nldesign-component-status-badge-danger-background-color,')
		expect(body).toContain('var(--nldesign-component-status-badge-error-background-color')
	})
})
