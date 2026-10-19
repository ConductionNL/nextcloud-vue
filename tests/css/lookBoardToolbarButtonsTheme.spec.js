/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the toolbar hands the board's neutral button to the
 * nldesign button tokens, and the Filter button keeps 12px sides and 14px
 * text. jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-toolbar-buttons-theme/specs/board-toolbar-buttons-theme/spec.md#requirement-board-toolbar-buttons-are-neutral-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-index.css: toolbar buttons under the nldesign theme', () => {
	it.each([
		'--nldesign-component-button-font-weight: 600;',
		'--nldesign-component-button-secondary-action-color: var(--color-main-text);',
		'--nldesign-component-button-secondary-action-background-color: var(--color-main-background);',
		'--nldesign-component-button-secondary-action-border-color: var(--color-border-dark);',
		'--nldesign-component-button-secondary-action-hover-background-color: var(--color-background-hover);',
	])('the bar sets %s', (token) => {
		expect(bodyOf('.cn-look-board .cn-actions-bar:not(.cn-look-nextcloud *)')).toContain(token)
	})

	it('pads the Filter button 12px at both sides with 14px text', () => {
		const body = bodyOf('.cn-look-board .cn-actions-bar__filter-button.button-vue')
		expect(body).toContain('padding: 0 12px;')
		expect(body).toContain('font-size: 14px;')
	})
})
