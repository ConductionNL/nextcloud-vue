/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's index side panel sets its title 20px in from the panel's edge
 * and 20px from its top (DqZakenSorteren, DqFilterBeheren). With the schema
 * icon hidden, NcAppSidebar's header pads its title 0 at the start and 8px on
 * top, so live drew it against the panel's edge (inset 1 against 21). jsdom
 * draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-sidebar-title-inset/specs/board-index-sidebar-title-inset/spec.md#requirement-the-index-side-panel-title-is-inset-as-the-board-draws-it
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
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: index side panel title inset', () => {
	it('pads the title 20px from the start and 15px from the top of the header', () => {
		const body = bodiesOf('.cn-look-board .cn-index-sidebar-panel .app-sidebar-header.app-sidebar-header .app-sidebar-header__info .app-sidebar-header__desc.app-sidebar-header__desc')
		expect(body).toContain('padding-inline-start: 20px;')
		expect(body).toContain('padding-block-start: 15px;')
	})
})
