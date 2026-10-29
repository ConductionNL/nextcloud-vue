/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board DqTeamwachtrij: a queue row's deadline reads in the tag inks, late
 * #a30000 at 700 ("nog 4 dagen") and soon #7a4f00 at 600 ("nog 6 dagen"),
 * through the status badge ink chain; live drew Nextcloud's warning orange.
 * The "Werkvoorraad per zaaktype" table head has no ground of its own: the
 * theme's table-header background drew a grey band behind it.
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-queue-inks/specs/board-queue-inks/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: queue row deadline inks', () => {
	it('sets a late deadline in the error tag ink at 700', () => {
		const body = bodiesOf('.cn-look-board .cn-object-row__trail .cn-cell-renderer__date--error:not(.cn-look-nextcloud *)')
		expect(body).toContain('color: var(--nldesign-component-status-badge-error-color, var(--nl-color-red-text, var(--color-error-text)));')
		expect(body).toContain('font-weight: 700;')
	})

	it('sets a soon deadline in the warning tag ink at 600', () => {
		const body = bodiesOf('.cn-look-board .cn-object-row__trail .cn-cell-renderer__date--warning:not(.cn-look-nextcloud *)')
		expect(body).toContain('color: var(--nldesign-component-status-badge-warning-color, var(--nl-color-orange-text, var(--color-warning-text)));')
		expect(body).toContain('font-weight: 600;')
	})
})

describe('look-board-index.css: record list table head', () => {
	it('has no ground of its own', () => {
		expect(bodiesOf('.cn-look-board .cn-record-list--table .cn-record-list__table th')).toContain('background-color: transparent;')
	})
})
