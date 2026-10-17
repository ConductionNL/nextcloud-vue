/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The selected quick-filter chip (DqZaken's "Alles 48") is light on dark. A
 * theme that forces the body ink onto every span (thematiq) reads that ink
 * from --nldesign-color-on-surface, so the chip and its count hand theirs
 * over; without it the label was dark on dark. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with the given selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleEndingWith(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: the selected quick-filter chip keeps its ink', () => {
	it('hands the chip label its light ink', () => {
		expect(ruleEndingWith('.cn-quick-filter-bar .cn-quick-filter-bar__tab--active:hover'))
			.toContain('--nldesign-color-on-surface: var(--color-main-background)')
	})

	it('hands the count on the selected chip its light ink', () => {
		expect(ruleEndingWith('.cn-quick-filter-bar .cn-quick-filter-bar__tab--active .cn-quick-filter-bar__count'))
			.toContain('--nldesign-color-on-surface: var(--color-primary-element-text)')
	})

	it('draws the count on the selected chip as a lighter bubble, not in the chip colour', () => {
		const rule = ruleEndingWith('.cn-quick-filter-bar .cn-quick-filter-bar__tab--active .cn-quick-filter-bar__count')
		expect(rule).toContain('background: color-mix(in srgb, var(--color-main-background) 15%, var(--color-main-text))')
		expect(rule).not.toContain('background: var(--cn-board-text-soft)')
	})
})
