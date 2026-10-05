/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnLinkCardsPage`: a page whose whole job is to
 * be a list of links has to be one for a screen reader and a keyboard too.
 */

const CnLinkCardsPage = require('../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue').default
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

const propsData = {
	title: 'Modules and more',
	description: 'Every page that is not in the daily menu.',
	categories: { sales: 'Sales', marketing: 'Marketing' },
	cards: [
		{ id: 'Leads', label: 'Leads', description: 'Every deal you are working on.', icon: 'CashMultiple', category: 'sales', route: 'Leads' },
		{ id: 'Pipeline', label: 'Pipeline', category: 'sales', route: 'Pipeline' },
		{ id: 'Segments', label: 'Segments', description: 'Groups of contacts.', category: 'marketing', route: 'Segments' },
		{ id: 'Docs', label: 'Documentation', href: 'https://docs.example.org' },
	],
}

/**
 * @param {object} [props] Props to mount with.
 * @return {object} The mounted page.
 */
function mountPage(props = propsData) {
	return mountAttached(CnLinkCardsPage, {
		propsData: props,
		global: { mocks: { $router: { resolve: (to) => ({ href: `/apps/x/${to.name}` }), push: () => Promise.resolve() } } },
	})
}

describe('CnLinkCardsPage: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with groups and cards', async () => {
		wrapper = mountPage()
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations when empty', async () => {
		wrapper = mountPage({ title: 'Modules and more', cards: [] })
		await expectAccessible(wrapper)
	})

	it('makes every card a link with an address, in the tab order', () => {
		wrapper = mountPage()
		const links = [...wrapper.element.querySelectorAll('a')]
		expect(links).toHaveLength(4)
		for (const link of links) {
			expect(link.getAttribute('href')).toBeTruthy()
			expect(link.hasAttribute('tabindex')).toBe(false)
			expect(link.closest('li')).not.toBeNull()
		}
	})

	it('keeps the headings in order: one h2, then an h3 per caption', () => {
		wrapper = mountPage()
		const levels = [...wrapper.element.querySelectorAll('h1, h2, h3, h4')].map((heading) => heading.tagName)
		expect(levels).toEqual(['H2', 'H3', 'H3'])
	})
})
