/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a button that is a link keeps the button's ink under a
 * theme that paints every link, and a settings card's actions are neutral.
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-link-buttons-keep-button-ink/specs/board-link-buttons-keep-button-ink/spec.md#requirement-a-board-button-that-is-a-link-keeps-the-button-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const LINK = '.cn-look-board a.button-vue:not(.cn-look-nextcloud *):not(.vue-crumb *)'
const ACTION = '.cn-look-board .cn-settings-section__actions .button-vue--secondary:not(.cn-look-nextcloud *)'

describe('look-board.css: a board button that is a link keeps the button ink', () => {
	it('hands the theme link tokens the main ink and no underline', () => {
		const body = bodyOf(LINK)
		expect(body).toContain('--nldesign-color-on-surface: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-color: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-text-decoration: none;')
		expect(body).toContain('text-decoration: none;')
	})

	it('keeps a primary link button in the primary text colour', () => {
		expect(bodyOf('.cn-look-board a.button-vue--primary:not(.cn-look-nextcloud *):not(.vue-crumb *)'))
			.toContain('--nldesign-component-link-color: var(--color-primary-element-text);')
	})
})

/**
 * @spec openspec/changes/board-link-buttons-keep-button-ink/specs/board-link-buttons-keep-button-ink/spec.md#requirement-a-settings-cards-actions-are-neutral-buttons
 */
describe('look-board.css: a settings card\'s actions are neutral buttons', () => {
	it('draws the main ink at 14px/600 on the main background with the control border', () => {
		const body = bodyOf(ACTION)
		expect(body).toContain('color: var(--color-main-text);')
		expect(body).toContain('--nldesign-color-on-surface: var(--color-main-text);')
		expect(body).toContain('background: var(--color-main-background);')
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 600;')
	})
})
