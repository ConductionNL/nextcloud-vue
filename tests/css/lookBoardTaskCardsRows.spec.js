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
		const row = rule('.cn-look-board .cn-notes-card__note:not(.cn-look-nextcloud *):last-child')
		expect(rule('.cn-look-board .cn-events-card__event:not(.cn-look-nextcloud *):last-child')).toContain('border-top: 1px solid var(--cn-board-hairline);')
		expect(row).toContain('padding-block: 12px;')
		expect(row).toContain('border-top: 1px solid var(--cn-board-hairline);')
		expect(row).toContain('border-bottom: none;')
	})

	it('shows a 32px round tile', () => {
		const tile = rule('.cn-look-board .cn-notes-card__initials:not(.cn-look-nextcloud *)')
		expect(rule('.cn-look-board .cn-events-card__day:not(.cn-look-nextcloud *)')).toContain('width: 32px;')
		expect(tile).toContain('display: inline-flex;')
		expect(tile).toContain('width: 32px;')
		expect(tile).toContain('border-radius: 50%;')
	})

	it('writes the title 15/600 and joins the meta with a dot', () => {
		expect(rule('.cn-look-board .cn-notes-card__body:not(.cn-look-nextcloud *)')).toContain('font-size: 15px;')
		expect(rule('.cn-look-board .cn-notes-card__time:not(.cn-look-nextcloud *)::before')).toContain('content: \' · \';')
	})

	it('outranks the cards\' scoped rules: every row selector carries a third class', () => {
		const selectors = [...css.matchAll(/([^{}]+)\{/g)]
			.flatMap(([, list]) => list.split(','))
			.map((one) => one.trim())
			.filter((one) => /^\.cn-look-board \.cn-(events|notes)-card__/.test(one))
		expect(selectors.length).toBeGreaterThan(20)
		selectors.forEach((one) => expect(one).toContain(':not(.cn-look-nextcloud *)'))
	})

	/** @spec openspec/changes/board-note-rows-tile-room/specs/task-cards/spec.md#requirement-a-board-note-row-keeps-its-tile-room-and-two-lines */
	it('keeps the tile\'s 44px for a note that is the last in its thread', () => {
		const last = '.cn-look-board .cn-notes-card__note:not(.cn-look-nextcloud *):last-child'
		expect(rule(last)).toContain('padding-inline: 44px 0;')
		expect(rule(last)).not.toMatch(/padding:\s/)
	})

	/** @spec openspec/changes/board-note-rows-tile-room/specs/task-cards/spec.md#requirement-a-board-note-row-keeps-its-tile-room-and-two-lines */
	it('takes Reply out of the flow, shown on hover and focus', () => {
		const reply = rule('.cn-look-board .cn-notes-card__note:not(.cn-look-nextcloud *) > .cn-notes-card__reply-btn')
		expect(reply).toContain('position: absolute;')
		expect(rule('.cn-look-board .cn-notes-card__note:not(.cn-look-nextcloud *):focus-within > .cn-notes-card__reply-btn')).toContain('opacity: 1;')
	})
})
