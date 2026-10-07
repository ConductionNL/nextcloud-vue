/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Two menu entries on one route that differ in their query: "All cases" and
 * "Woo requests" (Cases?caseType=…). On the unfiltered list `isActive` marked
 * only "All cases", but NcAppNavigationItem also lights a router link that
 * vue-router calls active, and vue-router ignores the query, so "Woo
 * requests" lit up too. An entry that shares its route now renders as a plain
 * link routed in the app; an entry with a route of its own stays a router
 * link.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-only-the-best-matching-menu-entry-is-active
 */
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const page = { render: () => null }

const manifest = {
	version: '1.0.0',
	pages: [{ id: 'Cases', route: '/cases' }, { id: 'Board', route: '/board' }],
	menu: [
		{ id: 'all', label: 'All cases', route: 'Cases', order: 1 },
		{ id: 'board', label: 'Board', route: 'Board', order: 2 },
		{ id: 'woo', label: 'Woo requests', route: 'Cases', query: { caseType: 'woo' }, order: 3 },
	],
}

async function mountAt(address) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/cases', name: 'Cases', component: page }, { path: '/board', name: 'Board', component: page }],
	})
	router.push(address)
	await router.isReady()
	const wrapper = mount(CnAppNav, {
		global: { plugins: [router], provide: { cnManifest: manifest, cnTranslate: (k) => k } },
	})
	await flushPromises()
	return { wrapper, router }
}

// @nextcloud/vue is stubbed in jest: each entry is a stub carrying the props
// CnAppNav passed. Whether the real NcAppNavigationItem lights a router link
// is measured in a browser in e2e/pixel-gaps-3.e2e.js.
const entry = (wrapper, id) => wrapper.find(`[data-testid="cn-nav-entry-${id}"]`)
const lit = (wrapper) => manifest.menu.map((m) => m.id).filter((id) => entry(wrapper, id).attributes('active') === 'true')

describe('CnAppNav: only the best-matching entry is active', () => {
	it('keeps an entry with a route of its own a router link, active on its route', async () => {
		const { wrapper } = await mountAt('/board')
		expect(wrapper.vm.linkTo(manifest.menu[1])).toEqual({ name: 'Board' })
		expect(wrapper.vm.linkHref(manifest.menu[1])).toBeNull()
		expect(entry(wrapper, 'board').attributes('to')).toBeDefined()
		expect(entry(wrapper, 'board').attributes('href')).toBeUndefined()
		expect(lit(wrapper)).toEqual(['board'])
	})

	it('lights only "All cases" on the unfiltered list', async () => {
		const { wrapper } = await mountAt('/cases')
		expect(lit(wrapper)).toEqual(['all'])
		// Neither shared-route entry is a router link the item could light.
		expect(entry(wrapper, 'all').attributes('to')).toBeUndefined()
		expect(entry(wrapper, 'woo').attributes('to')).toBeUndefined()
	})

	it('lights only "Woo requests" on the filtered list', async () => {
		const { wrapper } = await mountAt('/cases?caseType=woo')
		expect(lit(wrapper)).toEqual(['woo'])
	})

	it('renders shared-route entries as plain links that still route in the app', async () => {
		const { wrapper, router } = await mountAt('/board')
		expect(wrapper.vm.linkTo(manifest.menu[2])).toBeNull()
		expect(wrapper.vm.linkHref(manifest.menu[2])).toBe(router.resolve({ name: 'Cases', query: { caseType: 'woo' } }).href)
		expect(entry(wrapper, 'woo').attributes('href')).toBe('/cases?caseType=woo')
		await entry(wrapper, 'woo').trigger('click')
		await flushPromises()
		expect(router.currentRoute.value.fullPath).toBe('/cases?caseType=woo')
	})
})
