/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board settings card raises a text field's label above the control and the
 * field makes room for it. NcSelect's search is an NcInputField too, so both
 * rules caught it, but the select's own margin rules win over the field's: the
 * label rose 24px over a select that kept 6px, onto what stood above
 * (DqInstellingen and DqDashboard "Register", "Kadaster"). The text-field rules
 * now leave a select's inner field alone, and the select itself makes the room
 * and raises its label. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-select-label/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The body.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board.css: a select in a board settings card', () => {
	it('keeps the text-field label rules off a select\'s inner field', () => {
		expect(ruleFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .input-field:has(.input-field__label):not(.v-select *)')).toContain('margin-block-start: 26px;')
		expect(ruleFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .input-field__input:not(.v-select *) + .input-field__label')).toContain('inset-block-end: calc(100% + 4px);')
		expect(ruleFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .input-field:has(.input-field__label)')).toBeNull()
	})

	it('makes the room on the select and raises its label above the control', () => {
		expect(ruleFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .v-select:has(.input-field__label)')).toContain('margin-block-start: 26px;')
		const label = ruleFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .v-select .input-field__input + .input-field__label.input-field__label')
		expect(label).toContain('inset-block-end: calc(100% + 4px);')
		expect(label).toContain('font-weight: 600;')
	})
})
