/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the follow control on a detail page is the board's 28px
 * pill. jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-follow-pill/specs/board-follow-pill/spec.md#requirement-the-board-follow-control-is-a-pill
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

const PILL = '.cn-look-board .cn-detail-page .cn-follow-toggle .button-vue'

describe('look-board-detail.css: the follow pill', () => {
	it.each([
		'height: 28px;',
		'padding: 0 10px;',
		'border: 1px solid var(--cn-board-control-border);',
		'border-radius: 14px;',
		'background: var(--color-main-background);',
		'color: var(--color-main-text);',
		'font-size: 13px;',
		'--nldesign-component-button-font-weight: 600;',
		'--nldesign-component-button-border-radius: 14px;',
	])('draws %s', (declaration) => {
		expect(bodyOf(PILL)).toContain(declaration)
	})

	it('puts a 14px icon 6px from its label', () => {
		expect(bodyOf(`${PILL} .button-vue__wrapper`)).toContain('gap: 6px;')
		expect(bodyOf(`${PILL} .button-vue__icon`)).toContain('width: 14px;')
	})
})
