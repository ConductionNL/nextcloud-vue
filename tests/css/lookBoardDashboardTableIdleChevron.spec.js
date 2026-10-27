/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An idle sort chevron on a dashboard card takes no room and shows on hover or
 * focus (r33 DqDoorlooptijd Prestaties 641 vs 569). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const card = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper__content'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: an idle chevron on a dashboard card', () => {
	it('is out of the flow and hidden', () => {
		const body = rule(card + ' .cn-table-header__chevron--idle')
		expect(body).toContain('position: absolute;')
		expect(body).toContain('opacity: 0;')
	})

	it('shows on hover', () => {
		expect(css).toContain(card + ' th.cn-table-header--sortable:hover .cn-table-header__chevron--idle')
	})
})
