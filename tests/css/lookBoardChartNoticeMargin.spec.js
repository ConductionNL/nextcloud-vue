/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board chart's notice sits 12px under the chart and ends the card
 * (DqHandhaving matrix card 446). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

describe('look-board-detail.css: chart notice margin', () => {
	it('puts the notice 12px under the chart, nothing under it', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
		expect(css).toMatch(/\.cn-look-board \.cn-chart-widget \.cn-chart-widget__notice\.notecard:not\(\.cn-look-nextcloud \*\)\s*\{[^}]*margin: 12px 0 0;/)
	})
})
