/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A theme that forces the body ink onto every span (thematiq) reads that ink
 * from --nldesign-color-on-surface. A table header's sort label and a status
 * tag are spans, so each hands its own ink over; without it the headers drew
 * in the main text instead of the muted ink and the tags lost their tone
 * colour (PtNieuws "Titel", "Status"; "Concept" in amber).
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} file The stylesheet under src/css.
 * @param {string} selector The rule's selector.
 * @return {string} The rule body, or ''.
 */
function rule(file, selector) {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const match = css.match(new RegExp('(^|})\\s*' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}'))
	return match ? match[2] : ''
}

describe('table headers and status tags keep their ink under a theme', () => {
	it('hands a table header its muted ink', () => {
		const body = rule('table.css', '.cn-data-table th')
		expect(body).toContain('--nldesign-color-on-surface: var(--color-text-maxcontrast)')
		expect(body).toContain('color: var(--color-text-maxcontrast)')
	})

	it('hands a muted cell its muted ink', () => {
		expect(rule('table.css', '.cn-data-table td.cn-cell--muted')).toContain('--nldesign-color-on-surface: var(--color-text-maxcontrast)')
	})

	it('hands a status tag the ink its variant sets', () => {
		expect(rule('badge.css', '.cn-status-badge')).toContain('--nldesign-color-on-surface: var(--cn-status-badge-ink)')
	})
})
