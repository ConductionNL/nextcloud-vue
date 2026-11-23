/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Beside the board select (board-select-control), the board draws a text
 * field and a textarea with the same 1px control edge, and the index side
 * panel's text fields 40px tall (DqZakenSorteren's search field). A multiple
 * select draws its edge around its chips, on the toggle, so its search box
 * stays bare. jsdom draws no layout, so the rules are read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-text-field-control/specs/board-text-field-control/spec.md#requirement-a-board-text-field-is-the-boards-control
 */
const fs = require('fs')
const path = require('path')

const sheet = (name) => fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('board text field control', () => {
	const board = sheet('look-board.css')

	it.each([
		'.cn-look-board .input-field__input:not(.v-select *):not(.cn-look-nextcloud *)',
		'.cn-look-board .textarea__input:not(.cn-look-nextcloud *)',
		'.cn-look-board .v-select.select.vs--multiple:not(.cn-look-nextcloud *):not(.cn-dialog-board *) .vs__dropdown-toggle',
	])('%s draws the 1px control edge, no shadow', (selector) => {
		const body = bodiesOf(board, selector)
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('box-shadow: none;')
	})

	it('leaves a multiple select\'s search box bare', () => {
		const body = bodiesOf(board, '.cn-look-board .v-select.select.vs--multiple:not(.cn-look-nextcloud *):not(.cn-dialog-board *) .input-field__input')
		expect(body).toContain('border: 0;')
	})

	/**
	 * Every board text field is 40px tall (the side panel's search field,
	 * portaliq's sign-in settings), not only the side panel's.
	 *
	 * @spec openspec/changes/board-text-field-height/specs/board-text-field-height/spec.md#requirement-a-board-text-field-is-40px-tall
	 */
	it('draws every board text field 40px tall', () => {
		expect(bodiesOf(board, '.cn-look-board .input-field:not(.v-select *):not(.cn-look-nextcloud *) .input-field__main-wrapper')).toContain('height: calc(var(--cn-field-height, 40px) + 2 * var(--border-width-input-focused, 2px));')
		expect(bodiesOf(board, '.cn-look-board .input-field:not(.v-select *):not(.cn-look-nextcloud *) .input-field__input')).toContain('min-height: var(--cn-field-height, 40px);')
		expect(sheet('look-board-index.css')).not.toContain('.cn-index-sidebar-panel .input-field:not(.v-select *)')
	})
})
