/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A warning note in a board dialog reads as the boards draw it: the status
 * warning ground and ink at radius 8, 10px 14px in, 14px text on a 1.45 line,
 * the 4px ink edge kept as DqNieuweZaakDubbel draws it (PqGesprekNieuwContact
 * "Geen contact gevonden bij ..."). Read from the stylesheet.
 *
 * @spec openspec/changes/board-dialog-warning-note/specs/board-dialog-warning-note/spec.md#requirement-a-board-dialogs-warning-note-takes-the-status-warning-look
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('board dialog warning note', () => {
	const note = bodyOf('.cn-dialog-board .dialog__content .notecard.notecard--warning')
	const text = bodyOf('.cn-dialog-board .dialog__content .notecard.notecard--warning .notecard__text')

	it('takes the status warning ground and ink at radius 8', () => {
		expect(note).toContain('background-color: var(--nldesign-component-status-badge-warning-background-color, var(--color-warning-light, #fff4de)) !important;')
		expect(note).toContain('color: var(--nldesign-component-status-badge-warning-color, var(--color-warning-text)) !important;')
		expect(note).toContain('border-radius: 8px;')
		expect(note).toContain('border-inline-start-color: var(--note-theme);')
	})

	it('sits 10px 14px in with 14px text on a 1.45 line', () => {
		expect(note).toContain('padding: 10px 14px;')
		expect(note).toContain('gap: 10px;')
		expect(text).toContain('font-size: 14px !important;')
		expect(text).toContain('line-height: 1.45 !important;')
		expect(text).toContain('color: inherit !important;')
	})
})
