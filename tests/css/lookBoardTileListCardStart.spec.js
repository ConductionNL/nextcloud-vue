/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board card that opens on a grid of framed tiles sets them 14px under its
 * header, the boards' card gap. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: a card that opens on tiles', () => {
	it('pads its content 14px at the top', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-record-list--tiles):not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-top: 14px;')
	})
})
