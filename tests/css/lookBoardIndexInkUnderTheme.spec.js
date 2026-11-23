/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A theme that forces the body ink onto every span (thematiq) reads that ink
 * from --nldesign-color-on-surface. The index page's idle chip counts, the
 * Save view label and the active filter chips are spans on a tinted ground,
 * so each hands its own ink over; without it they drew in the body ink
 * (DqZaken "Weergave opslaan", DqWooVerzoeken "Zaaktype: Woo-verzoek").
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-ink-under-theme/specs/board-index-ink-under-theme/spec.md#requirement-board-index-controls-keep-their-ink-under-a-theme
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

describe('look-board-index.css: index controls keep their ink under a theme', () => {
	it('hands an idle chip count the soft text ink', () => {
		expect(ruleEndingWith('.cn-look-board .cn-quick-filter-bar .cn-quick-filter-bar__count'))
			.toMatch(/(^|[;\s])color: var\(--cn-board-text-soft\)/)
	})

	it('hands the Save view label the light primary ink', () => {
		expect(ruleEndingWith('.cn-look-board .cn-saved-views__save .button-vue'))
			.toContain('--nldesign-color-on-surface: var(--color-primary-element-light-text)')
	})

	it('hands an active filter chip label the light primary ink', () => {
		expect(ruleEndingWith('.cn-look-board .cn-actions-bar--board .cn-actions-bar__filter-chip'))
			.toContain('--nldesign-color-on-surface: var(--color-primary-element-light-text)')
	})
})
