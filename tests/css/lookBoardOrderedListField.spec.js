/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqPersoonlijkeInstellingen "Weergaven in mijn menu": a row's "Uit menu
 * halen" is an outlined secondary button, and the add select runs the full
 * width of the field. jsdom draws no layout, so the rules are read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-ordered-list-field/specs/board-ordered-list-field/spec.md#requirement-an-ordered-list-field-draws-its-remove-button-and-add-select-as-the-board
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const guard = ':not(.cn-look-nextcloud *)'

/**
 * @param {string} selector The rule's whole selector.
 * @return {string} Its body, or ''.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: an ordered list field', () => {
	it('outlines a labelled remove button as a secondary button', () => {
		const body = rule(`.cn-look-board .cn-ordered-list-field__button--text${guard}`)
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('height: 34px;')
		expect(body).toContain('background: var(--color-main-background);')
	})

	it('runs the add select the full width', () => {
		expect(rule(`.cn-look-board .cn-ordered-list-field__add .v-select${guard}`)).toContain('width: 100%;')
	})
})
