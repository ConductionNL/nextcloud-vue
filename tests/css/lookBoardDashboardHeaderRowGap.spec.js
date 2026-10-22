/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's page header sets the line under the title 13px below the
 * title's text (DqDagAfsluiten, DqCatalogus; live 7): the title row is as
 * tall as its buttons, and the rows stand 6px apart.
 * The dashboard header's grid set no row gap. jsdom draws no layout, so the
 * rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-header-row-gap/specs/board-dashboard-header-row-gap/spec.md#requirement-the-line-under-a-board-dashboard-title-sits-13px-below-it
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board.css: dashboard header row gap', () => {
	it('stacks the header rows 6px apart', () => {
		const body = bodiesOf('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__header')
		expect(body).toContain('row-gap: 6px;')
		expect(body).not.toContain('row-gap: 0;')
	})
})
