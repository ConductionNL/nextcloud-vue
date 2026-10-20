/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dialog's header, footer and fields as the dialog boards draw them
 * (DqOverdragen, DqBesluit, DqDocumentGenereren, DqNieuweZaak). jsdom draws no
 * layout, so the rules are read from the stylesheets.
 *
 * @spec openspec/changes/board-dialog-controls/specs/board-dialog-controls/spec.md#requirement-a-board-dialog-draws-its-controls-as-the-boards-do
 */
const fs = require('fs')
const path = require('path')

const read = (name) => fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const dialog = read('dialog.css')
const board = read('look-board.css')

/**
 * The declarations of every rule that lists exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The bodies, joined.
 */
function bodyOf(css, selector) {
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

describe('dialog.css: the board dialog', () => {
	it('pads the footer buttons 16px, 18px with an icon, at 14px, above NcButton\'s text-only rule', () => {
		const button = bodyOf(dialog, '.modal-mask.cn-dialog-board .dialog__actions .button-vue.button-vue')
		expect(button).toContain('--button-padding: 16px;')
		expect(button).toContain('font-size: 14px;')
		expect(bodyOf(dialog, '.modal-mask.cn-dialog-board .dialog__actions .button-vue.button-vue:has(> .button-vue__wrapper > .button-vue__icon:not(:empty)):has(> .button-vue__wrapper > .button-vue__text:not(:empty))')).toContain('--button-padding: 18px;')
		expect(bodyOf(dialog, '.modal-mask.cn-dialog-board .dialog__actions .button-vue .button-vue__text.button-vue__text')).toContain('padding-inline: 0;')
	})

	it('draws the close button as a 36px circle through NcButton\'s size token', () => {
		const close = bodyOf(dialog, '.cn-dialog-header .cn-dialog-header__close.button-vue')
		expect(close).toContain('--button-size: 36px;')
		expect(close).toContain('border-radius: 50%;')
		expect(close).not.toContain('--button-radius')
	})

	it('hands the subtitle\'s 14px muted line to the theme\'s paragraph tokens', () => {
		const subtitle = bodyOf(dialog, '.cn-dialog-header__subtitle')
		expect(subtitle).toContain('--nldesign-component-paragraph-font-size: 14px;')
		expect(subtitle).toContain('--nldesign-component-paragraph-color: var(--color-text-maxcontrast);')
	})

	it('inks the eyebrow in a text colour, never the text on a primary fill', () => {
		const root = bodyOf(dialog, '.cn-dialog-board')
		expect(root).toContain('--cn-dialog-eyebrow-color: var(--color-primary-element-light-text')
		expect(root).not.toContain('var(--color-primary-element-text')
		expect(bodyOf(dialog, '.cn-dialog-header__eyebrow')).toContain('--nldesign-color-on-surface: var(--cn-dialog-eyebrow-color')
	})

	it('draws a field\'s edge as a 1px border and a plain input at 40px', () => {
		const field = bodyOf(dialog, '.cn-dialog-board .dialog__content .textarea__input')
		expect(field).toContain('border: 1px solid var(--color-border-maxcontrast);')
		expect(field).toContain('box-shadow: none;')
		expect(bodyOf(dialog, '.cn-dialog-board .dialog__content input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=range]):not([type=color]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not(.input-field__input)')).toContain('height: var(--cn-field-height, 40px);')
	})
})

describe('look-board.css: a single select', () => {
	it('lets the field take the full width, so its buttons sit inside its border', () => {
		expect(bodyOf(board, '.cn-look-board .nc-select.v-select.select.vs--single .vs__selected-options')).toContain('max-width: none;')
	})
})

describe('CnSearchSelect: the field takes its row', () => {
	it('stretches NcSelect to the row and keeps the magnifier above the field', () => {
		const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnSearchSelect/CnSearchSelect.vue'), 'utf8')
		const style = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
		expect(bodyOf(style, '.cn-search-select :deep(.v-select)')).toContain('width: 100%;')
		expect(bodyOf(style, '.cn-search-select__magnifier')).toContain('z-index: 1;')
	})
})
