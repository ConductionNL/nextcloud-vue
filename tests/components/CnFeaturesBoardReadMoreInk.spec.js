/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqRoadmap: a feature card's "Learn more" is a bordered button in the
 * main ink. The nldesign theme paints every `<a>` in its link colour with
 * `!important` through its link tokens, so the button hands those tokens the
 * main ink. jsdom draws no layout, so the rule is read from the source.
 *
 * @spec openspec/changes/features-board-read-more-ink/specs/features-board-read-more-ink/spec.md#requirement-the-learn-more-button-keeps-the-main-ink-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the scoped rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(style))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('CnFeaturesBoard Learn more ink', () => {
	const body = rule('.cn-features-board__read-more')

	it('hands the theme link tokens the main ink', () => {
		expect(body).toContain('--nldesign-color-on-surface: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-color: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-hover-color: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-visited-color: var(--color-main-text);')
	})

	it('draws no underline under the theme', () => {
		expect(body).toContain('--nldesign-component-link-text-decoration: none;')
	})
})
