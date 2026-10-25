/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board table's rhythm and person chip, against DqZaken: the table at the
 * normal line height (a two-line row 66px, the header 50px), the header's sort
 * button without the 34px clickable area, and the initials on the light
 * primary tint in the primary ink. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: the board table rhythm', () => {
	it('sets the table at the normal line height', () => {
		expect(rule('.cn-look-board .cn-table-container--board .cn-data-table')).toContain('line-height: normal')
	})

	it('drops the clickable-area height from the header sort button', () => {
		expect(rule('.cn-look-board .cn-table-container--board .cn-data-table th .cn-table-header__sort')).toContain('min-height: 0')
	})

	it('draws the initials on the light primary tint in the primary ink', () => {
		const initials = rule('.cn-look-board .cn-table-container--board .cn-data-table .cn-cell-renderer__avatar-initials')
		expect(initials).toContain('background: var(--color-primary-element-light)')
		expect(initials).toContain('color: var(--color-primary-element-light-text)')
	})

	it('draws the selection checkbox as the 18px box alone, without the 42px clickable block', () => {
		const content = rule('.cn-look-board .cn-table-container--board .cn-data-table .checkbox-radio-switch .checkbox-radio-switch__content')
		expect(content).toContain('min-height: 0')
		expect(content).toContain('padding: 0')
	})

	it('gives the selection column 16px of padding either side, 60px in all', () => {
		const col = rule('.cn-look-board .cn-table-container--board .cn-data-table .cn-table-col--checkbox')
		expect(col).toContain('width: 60px')
		expect(col).toContain('padding-inline: 16px;')
	})

	it('draws the header labels 14px muted, the secondary line too', () => {
		const th = rule('.cn-look-board .cn-table-container--board .cn-data-table th')
		expect(th).toContain('font-size: 14px')
		expect(th).toMatch(/(^|[;\s])color: var\(--color-text-maxcontrast\)/)
		expect(css).toMatch(/td\.cn-table-col--title \.cn-table-cell__secondary \{\s*color: var\(--color-text-maxcontrast\)/)
	})
})
