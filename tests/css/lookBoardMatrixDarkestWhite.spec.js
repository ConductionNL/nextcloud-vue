/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The darkest step of a board scale matrix is white (r33 DqProcesanalyse
 * "70 d" in the light tint). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const selector = '.cn-look-board .cn-chart-widget__matrix:not(.cn-look-nextcloud *) .cn-chart-widget__matrix-cell--4'

describe('look-board.css: the darkest matrix step', () => {
	it('sets its figure in the primary element text colour', () => {
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('color: var(--color-primary-element-text);')
	})
})
