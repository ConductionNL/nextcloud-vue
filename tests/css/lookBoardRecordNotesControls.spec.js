/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board note rows (DqDagAfsluiten): the kind pill 12px from the title, the
 * buttons 40px, the closing pair at the two ends of their line. Read from the
 * stylesheet.
 *
 * @spec openspec/changes/board-record-notes-controls/specs/board-record-notes-controls/spec.md#requirement-board-note-rows-draw-the-board-controls
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const P = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

/**
 * @param {string} selector One selector of the rule.
 * @return {string} The declarations.
 */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board: note rows draw the board controls', () => {
	it('sets the pill 12px from the title, 40px buttons and the closing pair apart', () => {
		expect(rule(`${P} .cn-record-notes__head`)).toMatch(/gap:\s*8px 12px/)
		expect(rule(`${P} .cn-record-notes__fields .button-vue`)).toMatch(/--button-size:\s*var\(--cn-board-control-height\)/)
		expect(rule(`${P} .cn-record-notes__all-actions .button-vue`)).toMatch(/--button-size/)
		expect(rule(`${P} .cn-record-notes__all-actions`)).toMatch(/justify-content:\s*space-between/)
	})

	it('spaces a note row as drawn, its fields flush at the control height', () => {
		expect(rule(`${P} .cn-record-notes__ready`)).toMatch(/margin-bottom:\s*6px/)
		expect(rule(`${P} .cn-record-notes__row`)).toMatch(/padding:\s*16px 0/)
		expect(rule(`${P} .cn-record-notes__title`)).toMatch(/font-size:\s*16px/)
		expect(rule(`${P} .cn-record-notes__fields`)).toMatch(/gap:\s*12px/)
		expect(rule(`${P} .cn-record-notes__field-label`)).toMatch(/line-height:\s*1\.2/)
		const wrapper = rule(`${P} .cn-record-notes__fields .input-field__main-wrapper`)
		expect(wrapper).toMatch(/height:\s*var\(--cn-board-control-height\)/)
		expect(wrapper).toMatch(/padding:\s*0/)
	})
})
