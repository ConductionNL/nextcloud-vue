/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every page shell that draws its own heading keeps 56px free at the inline
 * start of that heading, so the Nextcloud navigation toggle (44px wide, at
 * the left edge of the content) does not cover the first letters of the
 * title. Seen on a live Nextcloud as "odules and more".
 *
 * WHAT THIS IS AND IS NOT. jsdom applies no scoped SFC styles, so this reads
 * each component's own `<style>` block and checks the declaration is there.
 * It is a guard against the rule being dropped, not a measurement of the
 * rendered page. The measurement is `e2e/link-cards-page.e2e.js`, which reads
 * the computed padding of the links page in a real browser.
 *
 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-heading-clears-the-navigation-toggle
 */
const fs = require('fs')
const path = require('path')

const COMPONENTS = path.resolve(__dirname, '../../src/components')

/**
 * The declarations of one rule in an SFC's `<style>` block.
 *
 * @param {string} file Path under src/components.
 * @param {string} selector The exact selector of the rule.
 * @return {string|null} The rule body, or null when the SFC has no such rule.
 */
function ruleBody(file, selector) {
	const source = fs.readFileSync(path.join(COMPONENTS, file), 'utf8')
	const style = source.slice(source.indexOf('<style'))
	const withoutComments = style.replace(/\/\*[\s\S]*?\*\//g, '')
	for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		if (match[1].trim() === selector) {
			return match[2]
		}
	}
	return null
}

const SHELLS = [
	['CnLinkCardsPage/CnLinkCardsPage.vue', '.cn-link-cards-page__header', 'cn-link-cards-page__header'],
	['CnReportsPage/CnReportsPage.vue', '.cn-reports-page__header', 'cn-reports-page__header'],
	['CnStorePage/CnStorePage.vue', '.cn-store-page__header', 'cn-store-page__header'],
	['CnWikiPage/CnWikiPage.vue', '.cn-wiki-page:not(.cn-wiki-page--has-sidebar) .cn-wiki-page__header', 'cn-wiki-page__header'],
]

describe('a page heading clears the navigation toggle', () => {
	it.each(SHELLS)('%s pads its header by 56px at the inline start', (file, selector) => {
		const body = ruleBody(file, selector)
		expect(body).not.toBeNull()
		expect(body).toMatch(/padding-inline-start:\s*56px\s*;/)
	})

	it.each(SHELLS)('%s still renders the element that rule styles', (file, _selector, className) => {
		// The rule is only worth something while the template uses the class.
		const source = fs.readFileSync(path.join(COMPONENTS, file), 'utf8')
		const template = source.slice(0, source.indexOf('<script'))
		expect(template).toContain(`class="${className}"`)
	})

	it('the reference shell, CnPageHeader, reserves the same 56px', () => {
		const css = fs.readFileSync(path.resolve(__dirname, '../../src/css/page-header.css'), 'utf8')
		expect(css).toMatch(/\.cn-page-header\s*\{[^}]*padding-inline-start:\s*56px;/)
	})
})
