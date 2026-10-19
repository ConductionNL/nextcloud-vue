/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a folder tab hands its weight and shape to the nldesign
 * button tokens, which the theme reads with `!important`, and is 37px tall
 * with or without a count. jsdom draws no layout, so the rules are read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-tabs-theme/specs/board-tabs-theme/spec.md#requirement-board-folder-tabs-keep-the-boards-weight-shape-and-height-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const TAB = '.cn-look-board .cn-tabs--board .cn-tabs__nav-item'

describe('look-board-detail.css: folder tabs under the nldesign theme', () => {
	it('hands a tab\'s regular weight and folder shape to the theme tokens', () => {
		const body = bodyOf(TAB)
		expect(body).toContain('--nldesign-component-button-font-weight: 400;')
		expect(body).toContain('--nldesign-component-button-border-radius: 8px 8px 0 0;')
	})

	it('hands the open tab\'s bold weight to the theme token', () => {
		expect(bodyOf(`${TAB}.cn-tabs__nav-item--active`)).toContain('--nldesign-component-button-font-weight: 700;')
	})

	it('draws a tab 37px tall and the open tab 1px taller', () => {
		expect(bodyOf(TAB)).toContain('min-height: 37px;')
		expect(bodyOf(`${TAB}.cn-tabs__nav-item--active`)).toContain('min-height: 38px;')
	})
})
