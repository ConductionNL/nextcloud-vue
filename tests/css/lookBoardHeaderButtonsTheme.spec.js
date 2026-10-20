/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the header buttons hand the board's weight and secondary
 * ground to the nldesign button tokens, which the theme reads with
 * `!important`. jsdom draws no layout, so the rule is read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-header-buttons-theme/specs/board-header-buttons-theme/spec.md#requirement-board-header-buttons-keep-the-boards-weight-and-ground-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector and sets a token.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function tokenBodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[2].includes('--nldesign-component-button') && m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const TOKENS = [
	'--nldesign-component-button-font-weight: 600;',
	'--nldesign-component-button-primary-action-font-weight: 600;',
	'--nldesign-component-button-secondary-action-color: var(--color-main-text);',
	'--nldesign-component-button-secondary-action-background-color: var(--color-main-background);',
	'--nldesign-component-button-secondary-action-border-color: var(--cn-board-control-border);',
	'--nldesign-component-button-secondary-action-hover-background-color: var(--color-background-hover);',
]

describe('look-board.css: header buttons under the nldesign theme', () => {
	it.each([
		'.cn-look-board .cn-index-page__header-buttons:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-detail-page__header-actions:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-dashboard-page__header-actions:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-settings-page__header-buttons:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-admin-settings-shell__header-buttons:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-action-buttons:not(.cn-look-nextcloud *)',
	])('%s hands the board button to the theme tokens', (selector) => {
		const body = tokenBodyOf(selector)
		for (const token of TOKENS) {
			expect(body).toContain(token)
		}
	})
})
