/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The brand block in the app top bar under the board look
 * (screens-brand-block-top-bar).
 *
 * @spec openspec/changes/screens-brand-block-top-bar/tasks.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'
import CnAppRoot from '../../src/components/CnAppRoot/CnAppRoot.vue'
import CnBrandBar from '../../src/components/CnBrandBar/CnBrandBar.vue'

const brand = { emblem: '/emblem.svg', caption: 'Gemeente Zuiddrecht', name: 'Dossiq' }

function mountRoot({ look = 'board', manifest = {}, slots = {}, props = {} } = {}) {
	return mount(CnAppRoot, {
		props: {
			appId: 'dossiq',
			manifest: { version: '1.0.0', menu: [], pages: [], nav: { brand }, ...manifest },
			requiresApps: [],
			look,
			...props,
		},
		slots,
		global: { stubs: { CnAppLoading: true, CnAppNav: true, CnEnvironmentBanner: true, CnCommandPalette: true, CnAiCompanion: true, CnObjectSidebar: true, CnWalkthrough: true }, mocks: { $route: { params: {} } } },
	})
}

describe('CnBrandBar', () => {
	it('draws the organisation above the app name, beside the emblem', () => {
		const w = mount(CnBrandBar, { props: { brand: { ...brand } } })
		expect(w.find('[data-testid="cn-brand-bar-emblem"]').attributes('src')).toBe('/emblem.svg')
		expect(w.find('[data-testid="cn-brand-bar-emblem"]').attributes('alt')).toBe('')
		const order = [...w.find('.cn-brand-bar__text').element.children].map((c) => c.textContent)
		expect(order).toEqual(['Gemeente Zuiddrecht', 'Dossiq'])
	})

	it('draws the theme emblem for emblem: true and puts the slot after the divider', () => {
		const w = mount(CnBrandBar, { props: { brand: { emblem: true, name: 'A' } }, slots: { default: '<i class="mine" />' } })
		expect(w.find('.cn-brand-bar__emblem--theme').exists()).toBe(true)
		expect(w.find('.cn-brand-bar__divider + .cn-brand-bar__content .mine').exists()).toBe(true)
	})
})

describe('the board look top bar in CnAppRoot (tasks 2, 3)', () => {
	it('renders the bar and the shell class under the board look', () => {
		const w = mountRoot()
		expect(w.findComponent(CnBrandBar).exists()).toBe(true)
		expect(w.classes()).toContain('cn-app-root--brand-bar')
	})

	it('renders the bar when the navigation is replaced through the menu slot', () => {
		const w = mountRoot({ slots: { menu: '<nav class="own-menu" />' } })
		expect(w.findComponent(CnBrandBar).exists()).toBe(true)
		expect(w.find('.own-menu').exists()).toBe(true)
	})

	it('reads the brand prop before the manifest', () => {
		const w = mountRoot({ props: { brand: { name: 'Other' } } })
		expect(w.find('.cn-brand-bar__name').text()).toBe('Other')
	})

	it('does not render without the board look, without a brand, or with placement nav', () => {
		expect(mountRoot({ look: '' }).findComponent(CnBrandBar).exists()).toBe(false)
		expect(mountRoot({ manifest: { nav: {} } }).findComponent(CnBrandBar).exists()).toBe(false)
		const nav = mountRoot({ manifest: { nav: { brand: { ...brand, placement: 'nav' } } } })
		expect(nav.findComponent(CnBrandBar).exists()).toBe(false)
		expect(nav.classes()).not.toContain('cn-app-root--brand-bar')
	})

	it('forwards the brand-bar slot into the bar', () => {
		const w = mountRoot({ slots: { 'brand-bar': '<span class="search" />' } })
		expect(w.find('.cn-brand-bar__content .search').exists()).toBe(true)
	})
})

describe('CnAppNav steps aside (task 3)', () => {
	const mountNav = (inTopBar, slots = {}) => mount(CnAppNav, {
		props: { manifest: { version: '1.0.0', menu: [], pages: [], nav: { brand } } },
		slots,
		global: { provide: { cnBrandInTopBar: inTopBar }, mocks: { $route: { params: {} } } },
	})

	it('draws its brand block when the bar does not', () => {
		expect(mountNav(false).find('[data-testid="cn-nav-brand"]').exists()).toBe(true)
	})

	it('skips its brand block when the bar draws it, but keeps a filled brand slot', () => {
		expect(mountNav(true).find('[data-testid="cn-nav-brand"]').exists()).toBe(false)
		const w = mountNav(true, { brand: '<b class="host-brand" />' })
		expect(w.find('.host-brand').exists()).toBe(true)
	})
})

describe('the bar stylesheet', () => {
	const css = fs.readFileSync(path.join(__dirname, '../../src/components/CnBrandBar/CnBrandBar.vue'), 'utf8')
	it('pins the board sizes', () => {
		expect(css).toMatch(/--cn-board-topbar-height, 68px/)
		expect(css).toMatch(/--cn-board-brand-width, 237px/)
		expect(css).toMatch(/--cn-nav-emblem-size, 34px/)
		expect(css).toMatch(/padding: 0 20px 0 14px/)
	})
})
