/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board matrix's group row is the boards' compact label line (PqPersoonlijk,
 * DqPersoonlijkeInstellingen: 14px above, 4px below), not an event row holding a
 * 34px Nextcloud button (60px live). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/notification-matrix-group-row/specs/notification-matrix/spec.md
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnNotificationMatrix/CnNotificationMatrix.vue'), 'utf8')
const board = sfc.slice(sfc.indexOf('.cn-notification-matrix--board {'))

/**
 * The declarations of the first rule with this selector in the board block.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or empty.
 */
function ruleOf(selector) {
	const at = board.indexOf(selector + ' {')
	return at === -1 ? '' : board.slice(at, board.indexOf('}', at))
}

describe('CnNotificationMatrix board group row', () => {
	it('drops the event rows\' padding from the group cell', () => {
		const rule = ruleOf(".cn-notification-matrix__table tbody th[scope='colgroup']")
		expect(rule).toContain('padding: 0;')
	})

	it('pads the group button 14px above and 4px below, without a clickable height or margin', () => {
		const rule = ruleOf('.cn-notification-matrix__group')
		expect(rule).toContain('display: block;')
		expect(rule).toContain('min-height: 0;')
		expect(rule).toContain('margin: 0;')
		expect(rule).toContain('padding: 14px 0 4px;')
		expect(rule).toContain('font-size: 13px;')
		expect(rule).toContain('font-weight: 600;')
	})
})
