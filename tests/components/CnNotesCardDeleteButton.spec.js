/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A note's Delete button sits at the row's end out of the flow, so it does
 * not add a 34px line under every note, and it shows on keyboard focus too.
 * Read from the component's style text.
 *
 * @spec openspec/changes/board-note-rows-tile-room/specs/task-cards/spec.md#requirement-a-board-note-row-keeps-its-tile-room-and-two-lines
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnNotesCard/CnNotesCard.vue'), 'utf8')

describe('CnNotesCard: Delete button', () => {
	it('outranks NcButton\'s position with the note\'s own class', () => {
		const at = source.indexOf('.cn-notes-card__note > .cn-notes-card__delete-btn {')
		expect(at).toBeGreaterThan(-1)
		expect(source.slice(at, source.indexOf('}', at))).toContain('position: absolute;')
	})

	it('shows on keyboard focus as on hover', () => {
		expect(source).toContain('.cn-notes-card__note:focus-within > .cn-notes-card__delete-btn')
	})
})
