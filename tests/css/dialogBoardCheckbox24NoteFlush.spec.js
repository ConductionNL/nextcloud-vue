/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog's checkbox is 24px and its notes add no margin (DqZaakSamenwerken r32). Read from the stylesheet.
 *
 * @spec openspec/changes/board-dialog-checkbox-24-note-flush/specs/board-dialog-checkbox-24-note-flush/spec.md
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

describe('src/css/dialog.css', () => {
	it('keeps the checkbox at 24px and the note flush', () => {
		expect(bodyOf('.cn-dialog-board .dialog__content .checkbox-radio-switch-checkbox:not(.checkbox-radio-switch--button-variant) .checkbox-content')).toMatch(/min-height:\s*24px/)
		expect(bodyOf('.cn-dialog-board .dialog__content .notecard.notecard')).toMatch(/margin-block:\s*0/)
	})
})
