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

/** Nextcloud's header, with one node of its own that must never be touched. */
function addHeader() {
	const header = document.createElement('div')
	header.id = 'header'
	header.innerHTML = '<div class="nc-own">Nextcloud</div>'
	document.body.appendChild(header)
	return header
}

afterEach(() => {
	document.body.innerHTML = ''
})

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
	it('puts one host first in #header and draws the organisation above the app name', async () => {
		const header = addHeader()
		const w = mount(CnBrandBar, { props: { brand: { ...brand } }, attachTo: document.body })
		await w.vm.$nextTick()
		expect(header.firstChild.className).toBe('cn-brand-bar-host')
		expect(header.querySelectorAll('.cn-brand-bar-host')).toHaveLength(1)
		const emblem = header.querySelector('[data-testid="cn-brand-bar-emblem"]')
		expect(emblem.getAttribute('src')).toBe('/emblem.svg')
		expect(emblem.getAttribute('alt')).toBe('')
		const order = [...header.querySelector('.cn-brand-bar__text').children].map((c) => c.textContent)
		expect(order).toEqual(['Gemeente Zuiddrecht', 'Dossiq'])
		expect(header.querySelector('.cn-brand-bar__divider')).not.toBeNull()
		w.unmount()
	})

	it('never touches the nodes Nextcloud drew, and removes only its own host on unmount', async () => {
		const header = addHeader()
		const own = header.querySelector('.nc-own')
		const w = mount(CnBrandBar, { props: { brand: { emblem: true, name: 'A' } }, attachTo: document.body })
		await w.vm.$nextTick()
		expect(header.querySelector('.cn-brand-bar__emblem--theme')).not.toBeNull()
		expect(own.parentNode).toBe(header)
		w.unmount()
		expect(header.querySelector('.cn-brand-bar-host')).toBeNull()
		expect(own.parentNode).toBe(header)
	})

	it('emits unavailable and renders nothing when there is no #header', async () => {
		const w = mount(CnBrandBar, { props: { brand: { ...brand } } })
		await w.vm.$nextTick()
		expect(w.emitted('unavailable')).toHaveLength(1)
		expect(document.querySelector('.cn-brand-bar')).toBeNull()
	})

	it('puts the same host back when Nextcloud re-renders the header, without a duplicate', async () => {
		const header = addHeader()
		const w = mount(CnBrandBar, { props: { brand: { ...brand } }, attachTo: document.body })
		await w.vm.$nextTick()
		const host = header.querySelector('.cn-brand-bar-host')
		// Nextcloud re-renders its header: our host is dropped with the rest.
		header.innerHTML = '<div class="nc-own">Re-rendered</div>'
		await new Promise((resolve) => setTimeout(resolve, 0))
		const hosts = header.querySelectorAll('.cn-brand-bar-host')
		expect(hosts).toHaveLength(1)
		expect(hosts[0]).toBe(host)
		expect(header.firstChild).toBe(host)
		expect(header.querySelectorAll('[data-testid="cn-brand-bar"]')).toHaveLength(1)
		w.unmount()
	})
})

describe('the brand block in CnAppRoot (tasks 2, 3)', () => {
	it('mounts the block in the header under the board look', async () => {
		const header = addHeader()
		const w = mountRoot()
		await w.vm.$nextTick()
		expect(w.findComponent(CnBrandBar).exists()).toBe(true)
		expect(header.querySelector('.cn-brand-bar-host')).not.toBeNull()
		w.unmount()
	})

	it('draws it when the navigation is replaced through the menu slot', async () => {
		addHeader()
		const w = mountRoot({ slots: { menu: '<nav class="own-menu" />' } })
		await w.vm.$nextTick()
		expect(w.findComponent(CnBrandBar).exists()).toBe(true)
		expect(w.find('.own-menu').exists()).toBe(true)
		w.unmount()
	})

	it('reads the brand prop before the manifest', async () => {
		const header = addHeader()
		const w = mountRoot({ props: { brand: { name: 'Other' } } })
		await w.vm.$nextTick()
		expect(header.querySelector('.cn-brand-bar__name').textContent).toBe('Other')
		w.unmount()
	})

	it('does not mount without the board look, without a brand, or with placement nav', () => {
		addHeader()
		expect(mountRoot({ look: '' }).findComponent(CnBrandBar).exists()).toBe(false)
		expect(mountRoot({ manifest: { nav: {} } }).findComponent(CnBrandBar).exists()).toBe(false)
		expect(mountRoot({ manifest: { nav: { brand: { ...brand, placement: 'nav' } } } }).findComponent(CnBrandBar).exists()).toBe(false)
	})

	it('falls back to the navigation when there is no #header', () => {
		const w = mountRoot()
		expect(w.findComponent(CnBrandBar).exists()).toBe(false)
		expect(w.vm.brandInHeader).toBe(false)
	})

	it('hands the block back to the navigation when the header disappears', async () => {
		const header = addHeader()
		const w = mountRoot()
		await w.vm.$nextTick()
		expect(w.vm.brandInHeader).toBe(true)
		header.remove()
		await new Promise((resolve) => setTimeout(resolve, 0))
		await w.vm.$nextTick()
		expect(w.vm.brandInHeader).toBe(false)
		w.unmount()
	})
})

describe('CnAppNav steps aside (task 3)', () => {
	const mountNav = (inTopBar, slots = {}) => mount(CnAppNav, {
		props: { manifest: { version: '1.0.0', menu: [], pages: [], nav: { brand } } },
		slots,
		global: { provide: { cnBrandInHeader: inTopBar }, mocks: { $route: { params: {} } } },
	})

	it('draws its brand block when the header does not', () => {
		expect(mountNav(false).find('[data-testid="cn-nav-brand"]').exists()).toBe(true)
	})

	it('skips its brand block when the header draws it, but keeps a filled brand slot', () => {
		expect(mountNav(true).find('[data-testid="cn-nav-brand"]').exists()).toBe(false)
		const w = mountNav(true, { brand: '<b class="host-brand" />' })
		expect(w.find('.host-brand').exists()).toBe(true)
	})
})

describe('the block stylesheet', () => {
	const css = fs.readFileSync(path.join(__dirname, '../../src/components/CnBrandBar/CnBrandBar.vue'), 'utf8')
	it('pins the board sizes', () => {
		expect(css).toMatch(/--cn-board-brand-width, 237px/)
		expect(css).toMatch(/--cn-nav-emblem-size, 34px/)
		expect(css).toMatch(/font-size: 13px/)
		expect(css).toMatch(/font-size: 18px/)
	})
})
