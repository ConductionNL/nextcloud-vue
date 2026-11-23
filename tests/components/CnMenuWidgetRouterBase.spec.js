/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A menu URL that already carries the app's router base
 * (`/index.php/apps/dossiq/settings/case-types`, dossiq's Catalogue menu) is a
 * path in the app: its href carries the base once, a click routes to the path
 * below the base, and the open page is the active item.
 *
 * @spec openspec/changes/menu-widget-links-under-router-base/specs/menu-widget-links-under-router-base/spec.md#requirement-a-menu-url-that-carries-the-apps-base-is-a-path-in-the-app
 */
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import CnMenuWidget from '@/components/CnMenuWidget/CnMenuWidget.vue'
import { computeActivePath, isActiveItem, toRoutePath } from '@/components/CnMenuWidget/menuActive.js'

const BASE = '/index.php/apps/dossiq'

/**
 * @return {object} A router mounted under dossiq's base.
 */
function makeRouter() {
	return createRouter({
		history: createWebHistory(BASE),
		routes: [{ path: '/:rest(.*)*', component: { render: () => null } }],
	})
}

const ITEMS = [
	{ label: 'Zaaktypen', url: `${BASE}/settings/case-types`, icon: '', children: [] },
	{ label: 'Kenmerken', url: '/settings/attributes', icon: '', children: [] },
	{ label: 'Objecttypen', url: `${BASE}/settings/catalogue`, icon: '', children: [] },
]

/**
 * @return {object} The mounted tree menu.
 */
function mountMenu() {
	return mount(CnMenuWidget, {
		propsData: { content: { style: 'tree', activeItemHighlight: 'background', items: ITEMS } },
		global: { plugins: [makeRouter()] },
	})
}

beforeEach(() => {
	window.history.replaceState(null, '', `${BASE}/settings/catalogue`)
})

describe('CnMenuWidget under a router base', () => {
	it('gives a URL with the base an href that carries the base once', () => {
		const links = mountMenu().findAll('a')
		expect(links.find((a) => a.text().includes('Zaaktypen')).attributes('href')).toBe(`${BASE}/settings/case-types`)
		expect(links.find((a) => a.text().includes('Kenmerken')).attributes('href')).toBe(`${BASE}/settings/attributes`)
	})

	it('routes a click to the path below the base', async () => {
		const wrapper = mountMenu()
		const push = jest.spyOn(wrapper.vm.$router, 'push').mockResolvedValue()
		await wrapper.findAll('a').find((a) => a.text().includes('Zaaktypen')).trigger('click')
		expect(push).toHaveBeenCalledWith('/settings/case-types')
	})

	it('marks the open page active', () => {
		const active = mountMenu().findAll('.cn-menu-widget__item--active')
		expect(active).toHaveLength(1)
		expect(active[0].text()).toContain('Objecttypen')
	})

	it('marks the open page active when its item is written without the base', () => {
		window.history.replaceState(null, '', `${BASE}/settings/attributes`)
		const active = mountMenu().findAll('.cn-menu-widget__item--active')
		expect(active).toHaveLength(1)
		expect(active[0].text()).toContain('Kenmerken')
	})
})

/**
 * @spec openspec/changes/menu-widget-links-under-router-base/specs/menu-widget-links-under-router-base/spec.md#requirement-the-open-page-is-the-active-item-under-a-router-base
 */
describe('menuActive under a router base', () => {
	const location = { pathname: `${BASE}/settings/catalogue` }

	it('matches an item written with or without the base', () => {
		expect(isActiveItem(`${BASE}/settings/catalogue`, location, BASE)).toBe(true)
		expect(isActiveItem('/settings/catalogue', location, BASE)).toBe(true)
		expect(isActiveItem('/settings', location, BASE)).toBe(true)
		expect(isActiveItem('/settings/case-types', location, BASE)).toBe(false)
	})

	it('keeps the old behaviour without a base', () => {
		expect(isActiveItem('/settings/catalogue', location)).toBe(false)
		expect(computeActivePath({ items: ITEMS, currentLocation: location }).leafKey).toBe('2')
	})

	it('turns a URL with the base into its route path and leaves others alone', () => {
		const router = makeRouter()
		expect(toRoutePath(`${BASE}/settings/case-types?x=1`, router)).toBe('/settings/case-types?x=1')
		expect(toRoutePath(BASE, router)).toBe('/')
		expect(toRoutePath(`${BASE}-other/x`, router)).toBe(`${BASE}-other/x`)
		expect(toRoutePath('/settings', router)).toBe('/settings')
		expect(toRoutePath('https://example.test', router)).toBe('https://example.test')
	})
})
