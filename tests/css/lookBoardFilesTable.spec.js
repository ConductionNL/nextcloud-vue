/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look CnFilesBrowser's list is the board's compact table
 * (DqDocumentenBeheer; COMPDIFF r24: header 15px/400 on grey, cells 4px 8px,
 * the ticked row grey, "Document" a 34px grey button, a bare row menu).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-files-table/specs/board-files-table/spec.md#requirement-a-board-file-list-is-the-boards-compact-table
 */
const fs = require('fs')
const path = require('path')

/**
 * A stylesheet's text without its comments.
 *
 * @param {string} file The file under src/css.
 * @return {string} The text.
 */
function read(file) {
	return fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

const detail = read('look-board-detail.css')
const index = read('look-board-index.css')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const NOT_NC = ':not(.cn-look-nextcloud *)'
const TABLE = '.cn-look-board .cn-files-browser__table'

describe('look-board-detail.css: the file list', () => {
	it.each([
		'background: var(--cn-board-table-head-bg, color-mix(in srgb, var(--color-background-hover) 40%, var(--color-main-background)));',
		'--nldesign-component-table-header-background-color: var(--cn-board-table-head-bg, color-mix(in srgb, var(--color-background-hover) 40%, var(--color-main-background)));',
		'color: var(--color-text-maxcontrast);',
		'font-size: 14px;',
		'font-weight: 600;',
		'padding: 10px 12px;',
		'border-bottom: 0;',
	])('draws the header cell with %s', (declaration) => {
		expect(bodyOf(detail, `${TABLE} th${NOT_NC}`)).toContain(declaration)
	})

	it.each([
		'padding: 11px 12px;',
		'font-size: 14px;',
		'border-top: 1px solid var(--cn-board-hairline);',
		'border-bottom: 0;',
	])('draws the data cell with %s', (declaration) => {
		expect(bodyOf(detail, `${TABLE} td${NOT_NC}`)).toContain(declaration)
	})

	it('leaves a focused row on its own ground', () => {
		expect(bodyOf(detail, `.cn-look-board .cn-files-browser__row:focus-within:not(:hover)${NOT_NC}`)).toContain('background-color: transparent;')
	})

	it.each([
		'min-height: 0;',
		'height: auto;',
		'border-radius: 0;',
		'background: transparent;',
		'font-weight: 600;',
		'line-height: inherit;',
	])('draws the sort label with %s', (declaration) => {
		expect(bodyOf(detail, `.cn-look-board .cn-files-browser__sort${NOT_NC}`)).toContain(declaration)
	})

	it('sets the name at 600, underlined, over a 14px second line', () => {
		const name = bodyOf(detail, `${TABLE} .cn-files-browser__name${NOT_NC}`)
		expect(name).toContain('font-weight: 600;')
		expect(name).toContain('text-decoration: underline;')
		expect(bodyOf(detail, `${TABLE} .cn-files-browser__name-secondary${NOT_NC}`)).toContain('font-size: 14px;')
	})
})

describe('look-board-index.css: the file list row menu', () => {
	const MENU = '.cn-look-board .cn-files-browser__col-actions:not(:has(.cn-files-browser__row-button)) .cn-files-browser__row-menu .button-vue'

	it('is the board row menu square', () => {
		const body = bodyOf(index, MENU)
		expect(body).toContain('width: 34px !important;')
		expect(body).toContain('border: 1px solid var(--cn-board-control-border) !important;')
		expect(bodyOf(index, `${MENU}:hover`)).toContain('height: 34px !important;')
	})
})
