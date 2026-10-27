/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board detail header without a widget row pads 8px under its last row,
 * as the boards draw it. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: the board detail header', () => {
	it('pads 8px below when it has no widget row', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page__header--board:not(.cn-detail-page__header--with-widget) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-bottom: 8px;')
	})
})
