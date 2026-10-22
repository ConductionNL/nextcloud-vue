/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board sets the dashboard description about 13px below the title's
 * text. A title row that holds the 40px buttons plus the grid's 6px row
 * gap already makes that, and the description's own 6px top margin came on
 * top (live 19). Without buttons the margin stays. jsdom
 * draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-description-gap/specs/board-dashboard-description-gap/spec.md#requirement-the-board-dashboard-description-adds-no-margin-of-its-own-above-it
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

describe('look-board.css: dashboard description gap', () => {
	it('drops the description top margin when the title row holds buttons', () => {
		const body = bodiesOf('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__header:has(> .cn-dashboard-page__header-actions > *) .cn-dashboard-page__description')
		expect(body).toContain('margin-top: 0;')
	})

	it('keeps the header rows 6px apart', () => {
		const body = bodiesOf('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__header')
		expect(body).toContain('row-gap: 6px;')
	})
})
