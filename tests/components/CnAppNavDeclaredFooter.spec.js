/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `nav.footer` declares the navigation footer: which footer entries render,
 * in what order, and whether the settings foldout comes before them. The
 * board shows only "Instellingen" and "Hulp en uitleg". Without the key the
 * footer is today's: help, every footer entry, then the foldout.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-footer-can-be-declared
 */
import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))

const pages = [{ id: 'Cases', route: '/cases' }]
const menu = [
	{ id: 'cases', label: 'All cases', route: 'Cases', order: 1 },
	{ id: 'store', label: 'Store', href: '#store', section: 'footer', order: 90 },
	{ id: 'reports', label: 'Reports', href: '#reports', section: 'footer', order: 91 },
	{ id: 'roadmap', label: 'Features & roadmap', href: '#roadmap', section: 'footer', order: 92 },
	{ id: 'forms', label: 'Forms', href: '#forms', section: 'settings', order: 95 },
]

function mountNav(nav = {}) {
	return mount(CnAppNav, {
		global: {
			provide: { cnManifest: { version: '1.0.0', pages, menu, nav: { help: { label: 'Help', href: '#help' }, ...nav } }, cnTranslate: (k) => k },
			mocks: { $route: { name: 'Cases', path: '/cases' }, $router: { resolve: () => ({ href: '#' }), push: jest.fn() } },
		},
	})
}

function footerIds(w) {
	return w.findAll('.cn-app-nav__footer-list [data-testid]')
		.map((el) => el.attributes('data-testid'))
}
function settingsIds(w) {
	return w.findAll('[data-testid="cn-nav-settings"] [data-testid^="cn-nav-entry-"]')
		.map((el) => el.attributes('data-testid'))
}

describe('CnAppNav: declared footer', () => {
	it('renders today\'s footer without nav.footer: help, every footer entry, then the foldout', () => {
		const w = mountNav()
		expect(footerIds(w)).toEqual(['cn-nav-help', 'cn-nav-entry-store', 'cn-nav-entry-reports', 'cn-nav-entry-roadmap'])
		expect(settingsIds(w)).toEqual(['cn-nav-entry-forms'])
		expect(w.find('.cn-app-nav__footer-list').classes()).not.toContain('cn-app-nav__footer-list--after-settings')
		expect(w.find('[data-testid="cn-nav-settings"]').classes()).not.toContain('cn-app-nav__settings--first')
	})

	it('keeps only the named entries, and moves the rest into the foldout', () => {
		const w = mountNav({ footer: ['settings', 'help'] })
		expect(footerIds(w)).toEqual(['cn-nav-help'])
		expect(settingsIds(w)).toEqual(['cn-nav-entry-forms', 'cn-nav-entry-store', 'cn-nav-entry-reports', 'cn-nav-entry-roadmap'])
	})

	it('puts the foldout above the list when settings comes first', () => {
		const w = mountNav({ footer: ['settings', 'help'] })
		expect(w.find('[data-testid="cn-nav-settings"]').classes()).toContain('cn-app-nav__settings--first')
		expect(w.find('.cn-app-nav__footer-list').classes()).toContain('cn-app-nav__footer-list--after-settings')
	})

	it('follows the declared order, help after an entry named before it', () => {
		const w = mountNav({ footer: ['reports', 'help', 'settings'] })
		expect(footerIds(w)).toEqual(['cn-nav-entry-reports', 'cn-nav-help'])
		expect(w.find('[data-testid="cn-nav-settings"]').classes()).not.toContain('cn-app-nav__settings--first')
	})

	it('drops the help entry when the declared footer leaves it out', () => {
		const w = mountNav({ footer: ['store'] })
		expect(footerIds(w)).toEqual(['cn-nav-entry-store'])
		expect(w.find('[data-testid="cn-nav-help"]').exists()).toBe(false)
	})
})
