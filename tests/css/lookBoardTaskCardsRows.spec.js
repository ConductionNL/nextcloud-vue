/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak: appointment and note rows in the board look, a hairline above each,
 * a 32px round tile, the title 15/600 and a 13px meta line joined with " · ".
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-task-cards-rows/specs/task-cards/spec.md#requirement-board-appointment-and-note-rows-carry-a-tile-and-a-meta-line
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule whose selector list names this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies joined, '' when none.
 */
function rule(selector) {
	return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
		.filter(([, selectors]) => selectors.split(',').map((one) => one.trim()).includes(selector))
		.map(([, , body]) => body)
		.join('\n')
}

describe('look-board-detail.css: task card rows', () => {
	it('draws a hairline above every row, 12px 0, none below the last', () => {
		const row = rule('.cn-look-board .cn-notes-card__note:last-child')
		expect(rule('.cn-look-board .cn-events-card__event:last-child')).toContain('border-top: 1px solid var(--cn-board-hairline);')
		expect(row).toContain('padding: 12px 0;')
		expect(row).toContain('border-top: 1px solid var(--cn-board-hairline);')
		expect(row).toContain('border-bottom: none;')
	})

	it('shows a 32px round tile', () => {
		const tile = rule('.cn-look-board .cn-notes-card__initials')
		expect(rule('.cn-look-board .cn-events-card__day')).toContain('width: 32px;')
		expect(tile).toContain('display: inline-flex;')
		expect(tile).toContain('width: 32px;')
		expect(tile).toContain('border-radius: 50%;')
	})

	it('writes the title 15/600 and joins the meta with a dot', () => {
		expect(rule('.cn-look-board .cn-notes-card__body')).toContain('font-size: 15px;')
		expect(rule('.cn-look-board .cn-notes-card__time::before')).toContain('content: \' · \';')
	})
})
