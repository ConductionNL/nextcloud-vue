/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog's field rows follow the boards' rhythm (DqNieuweZaak): the label and the help line stand on the
 * font's own leading, and a search select sits level with the selects beside it. jsdom draws no layout, so the rules
 * are read from the stylesheet.
 *
 * @spec openspec/changes/board-dialog-field-rhythm/specs/board-dialog-field-rhythm/spec.md#requirement-a-board-dialog-field-row-follows-the-board-rhythm
 */
const fs = require('fs')
const path = require('path')

const dialog = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule that lists this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies, joined.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(dialog))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('dialog.css: a board dialog field row', () => {
	it('sets the label, its optional note and the help line on the font\'s own leading', () => {
		for (const part of ['cn-form-field__label', 'cn-form-field__optional', 'cn-form-dialog__helper']) {
			expect(bodyOf(`.cn-dialog-board .dialog__content .${part}`)).toContain('line-height: normal;')
		}
	})

	it('drops NcSelect\'s 6px top margin on a search select, as on a plain select (Aanvrager beside Intakekanaal)', () => {
		expect(bodyOf('.cn-dialog-board .dialog__content .cn-form-dialog__party-wrapper .cn-search-select > .v-select.select:not(:has(.input-field__label))')).toContain('margin-block: 0;')
		expect(bodyOf('.cn-dialog-board .dialog__content .cn-form-dialog__select-wrapper > .v-select.select:not(:has(.input-field__label))')).toContain('margin-block: 0;')
	})
})
