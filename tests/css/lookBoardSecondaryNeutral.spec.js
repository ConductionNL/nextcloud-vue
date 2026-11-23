/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a secondary NcButton is neutral: the primary-light
 * variables NcButton draws a secondary from point at the main background,
 * the hover ground and the main text, and the button carries the 1px control
 * border. jsdom draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-secondary-neutral/specs/board-secondary-neutral/spec.md#requirement-a-board-secondary-button-is-neutral
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board.css: secondary button', () => {
	const guard = ':where(:not(.cn-look-nextcloud *):not(.vue-crumb *))'

	it.each(['button-vue--secondary', 'button-vue--vue-secondary'])('draws a %s neutral', (variant) => {
		const body = ruleFor(`.cn-look-board .button-vue.${variant}${guard}`)
		expect(body).not.toBeNull()
		expect(body).toContain('--color-primary-element-light: var(--color-main-background);')
		expect(body).toContain('--color-primary-element-light-hover: var(--color-background-hover);')
		expect(body).toContain('--color-primary-element-light-text: var(--color-main-text);')
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('color: var(--color-main-text);')
	})
})
