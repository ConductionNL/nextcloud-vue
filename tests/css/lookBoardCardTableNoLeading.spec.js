/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board card that opens on a record-list table starts 12px under its title,
 * without the first-line half-leading taken off for text (r31 DqZaaktype
 * "Berichten aan de aanvrager" 2.2px high). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: a card that opens on a table', () => {
	it('pads its content 12px at the top', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-record-list > .cn-record-list__table:first-child):not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-top: 12px;')
	})
})
