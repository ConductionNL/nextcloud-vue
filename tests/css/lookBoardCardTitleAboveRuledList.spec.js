/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Over a list that rules above its first row, a board dashboard card's title
 * stands 6px above the rule (DqMijnTeam "Vastgelopen zaken", DqMijnWerk
 * "Zaken die u volgt"). Read from the stylesheet.
 *
 * @spec openspec/changes/board-card-title-above-ruled-list/specs/board-card-title-above-ruled-list/spec.md#requirement-a-ruled-list-starts-6px-under-the-card-title
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board: a card title over a ruled list', () => {
	it('stands 6px above the first rule of a record list, task list or decision list', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		let found = null
		let m
		while ((m = re.exec(css))) {
			if (m[1].includes('.cn-record-list--rule-above') && m[1].includes('.cn-widget-wrapper__header') && /padding-bottom:\s*6px/.test(m[2])) {
				found = m[1]
			}
		}
		expect(found).not.toBeNull()
		expect(found).toContain('.cn-tasks-widget__list')
		expect(found).toContain('.cn-decision-list__rows')
		expect(found).toContain('.cn-nc-widget-widget__body--vertical')
	})
})
