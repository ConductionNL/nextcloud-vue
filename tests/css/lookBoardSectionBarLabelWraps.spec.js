/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A bar label in a board sections card wraps (r33 DqDoorlooptijd Naleving per
 * zaaktype 234 vs 249). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const selector = '.cn-look-board .cn-sections-widget__section .cn-chart-widget__bar-list:not(.cn-look-nextcloud *) .cn-chart-widget__bar-label'

describe('look-board.css: a section bar label', () => {
	it('wraps instead of being cut off', () => {
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('white-space: normal;')
		expect(body).toContain('overflow: visible;')
	})
})
