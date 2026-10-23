/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a quick-filter or saved-view chip hands its pill radius
 * and weight to the nldesign button tokens, which the theme reads with
 * `!important`. jsdom draws no layout, so the rule is read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-chips-theme/specs/board-chips-theme/spec.md#requirement-board-chips-stay-pills-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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
		if (m[2].includes('--nldesign-component-button') && m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board-index.css: chips under the nldesign theme', () => {
	it.each([
		'.cn-look-board .cn-quick-filter-bar .cn-quick-filter-bar__tab',
		'.cn-look-board .cn-saved-views__chips .cn-saved-views__chip',
	])('%s hands its pill radius and weight to the theme tokens', (selector) => {
		const body = tokenBodyOf(selector)
		expect(body).toContain('--nldesign-component-button-border-radius: 19px;')
		expect(body).toContain('--nldesign-component-button-font-weight: 600;')
	})
})
