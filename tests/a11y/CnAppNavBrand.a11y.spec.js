/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for the brand block at the top of `CnAppNav`,
 * against the real `NcAppNavigation`. The unit suite stubs that component and
 * cannot say where the block lands; this one can.
 */

const CnAppNav = require('../../src/components/CnAppNav/CnAppNav.vue').default
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

const manifest = {
	version: '1.0.0',
	pages: [],
	menu: [{ id: 'cases', label: 'Cases', route: 'cases' }, { id: 'board', label: 'Board', route: 'board' }],
	nav: { brand: { logo: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', name: 'dossiq', caption: 'Gemeente Zuiddrecht' } },
}

/**
 * @param {object} [propsData] Extra props.
 * @return {object} The mounted wrapper.
 */
function mountNav(propsData = {}) {
	return mountAttached(CnAppNav, {
		propsData,
		global: {
			provide: { cnManifest: manifest, cnTranslate: (k) => k },
			mocks: { $route: { name: 'cases', path: '/cases' } },
			stubs: { RouterLink: { template: '<a href="#"><slot /></a>' } },
		},
	})
}

describe('CnAppNav brand: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with a brand block', async () => {
		wrapper = mountNav()
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with a logo that stands alone', async () => {
		wrapper = mountNav({ brand: { logo: manifest.nav.brand.logo, alt: 'Gemeente Zuiddrecht' } })
		await expectAccessible(wrapper)
	})

	it('sits at the top of the navigation, before the first menu entry', () => {
		wrapper = mountNav()
		const block = wrapper.element.querySelector('[data-testid="cn-nav-brand"]')
		const firstEntry = wrapper.element.querySelector('[data-testid="cn-nav-entry-cases"]')
		expect(block).not.toBeNull()
		expect(firstEntry).not.toBeNull()
		// DOCUMENT_POSITION_FOLLOWING: the entry comes after the brand.
		expect(block.compareDocumentPosition(firstEntry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})

	it('adds nothing a keyboard has to tab through', () => {
		wrapper = mountNav()
		const block = wrapper.element.querySelector('[data-testid="cn-nav-brand"]')
		expect(block.querySelectorAll('a, button, [tabindex]')).toHaveLength(0)
	})
})
