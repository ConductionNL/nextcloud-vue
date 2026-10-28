/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board stat tile in a detail page's body grid or band sits on the board's
 * 16px 18px inset (PqProduct "Op deals", PqProject "Voortgang").
 *
 * @spec openspec/changes/board-detail-stat-tile-inset/specs/board-detail-stat-tile-inset/spec.md#requirement-a-board-stat-tile-on-a-detail-page-body-sits-on-the-boards-inset
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: a stat tile in a detail page body', () => {
	it('drops the card-fit cell padding around the tile', () => {
		const body = ruleFor('.cn-look-board .cn-detail-page .cn-detail-page__card-fit:not(.cn-detail-page__side *) > .cn-widget-wrapper__content:has(> .cn-kpi-card--board.cn-kpi-card--stacked)')
		expect(body).toContain('padding: 0;')
	})

	it('draws the tile 16px 18px in, without its own hover border', () => {
		const body = ruleFor('.cn-look-board .cn-detail-page .cn-detail-page__card-fit:not(.cn-detail-page__side *) > .cn-widget-wrapper__content > .cn-kpi-card--board.cn-kpi-card--stacked')
		expect(body).toContain('--cn-kpi-stacked-padding: 16px 18px;')
		expect(body).toContain('border-width: 0;')
	})
})
