/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a table header cell hands the board's ground, ink and
 * weight to the nldesign table header and button tokens, which the theme
 * reads with `!important`. jsdom draws no layout, so the rule is read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-table-head-theme/specs/board-table-head-theme/spec.md#requirement-a-board-table-header-keeps-the-boards-ground-ink-and-weight-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board-index.css: table header under the nldesign theme', () => {
	const body = bodyOf('.cn-look-board .cn-table-container--board .cn-data-table th')

	it.each([
		'--nldesign-component-table-header-background-color: var(--cn-board-table-head-bg, color-mix(in srgb, var(--color-background-hover) 40%, var(--color-main-background)));',
		'--nldesign-component-table-header-color: var(--color-text-maxcontrast);',
		'--nldesign-component-table-header-font-weight: 600;',
		'--nldesign-component-button-font-weight: 600;',
	])('sets %s', (declaration) => {
		expect(body).toContain(declaration)
	})
})
