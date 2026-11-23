/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A multiple select in a board dialog is the board's 40px field with its 1px
 * edge (DqFilterDelen "Delen met"). The edge sits on the toggle, which holds
 * the chips and the search, so the chosen people and groups are inside the
 * field, and the search draws no second edge. Focus darkens the edge to the
 * text colour; the outline ring of patches.css stays (WCAG 2.4.7). Checked on
 * :8080 with three chips. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dialog-multiselect-field/specs/board-dialog-multiselect-field/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const patches = fs.readFileSync(path.join(__dirname, '../../src/css/patches.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector list.
 *
 * @param {string} source The stylesheet text.
 * @param {string} selector The selector list.
 * @return {string|null} The body.
 */
function body(source, selector) {
	const at = source.indexOf(`${selector} {`)
	return at === -1 ? null : source.slice(at, source.indexOf('}', at))
}

const SELECT = '.cn-dialog-board .dialog__content .v-select.select.vs--multiple'

describe('dialog.css: a multiple select in a board dialog', () => {
	it('draws the 40px edge on the toggle, around the chips', () => {
		const rule = body(css, `${SELECT} .vs__dropdown-toggle`)
		expect(rule).toContain('min-height: var(--cn-field-height, 40px);')
		expect(rule).toContain('border: 1px solid var(--color-border-maxcontrast);')
		expect(rule).toContain('border-radius: 8px;')
	})

	it('leaves the search inside the toggle without an edge of its own', () => {
		expect(body(css, `${SELECT} .input-field__input,\n${SELECT} .input-field__input:hover:not([disabled])`)).toContain('border: 0;')
	})

	it('keeps a visible focus: the edge darkens and the ring stays', () => {
		expect(body(css, `${SELECT}:not(.vs--disabled) .vs__dropdown-toggle:focus-within`)).toContain('border-color: var(--color-main-text);')
		expect(css).not.toMatch(/vs__dropdown-toggle[^{]*\{[^}]*outline:\s*(none|0)/)
		expect(body(patches, '.v-select .vs__dropdown-toggle:focus-within')).toContain('outline: 2px solid var(--color-main-text) !important;')
	})
})
