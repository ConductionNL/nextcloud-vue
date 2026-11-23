/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row menu in an edge-to-edge card table (DqZaakGerelateerd "Objecten"):
 * the last column takes the card's 22px end padding, so its 66px left the
 * 34px menu 28px and the card cut it off (r29). The column grows by that
 * padding. Read from the stylesheet text.
 *
 * @spec openspec/changes/bleed-table-row-menu-fits/specs/object-list/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a row menu in a bleed table', () => {
	it('widens the last actions column by the card padding', () => {
		const body = rule('.cn-look-board .cn-detail-page .cn-widget-wrapper__content > .cn-object-list-widget--bleed .cn-table-container .cn-data-table .cn-table-col--actions:last-child')
		expect(body).toContain('width: calc(50px + var(--cn-board-card-inline-padding))')
		expect(body).toContain('min-width: calc(50px + var(--cn-board-card-inline-padding))')
	})
})
