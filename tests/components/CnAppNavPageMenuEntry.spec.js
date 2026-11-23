/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page with no menu entry of its own names the entry it belongs under with
 * `menuEntry`: the Mailbox marks Team queue (DqPostvak). The entry it names is
 * marked only while no entry matches the route by the usual rules, and only
 * that one.
 *
 * @spec openspec/changes/page-names-its-menu-entry/specs/page-names-its-menu-entry/spec.md#requirement-a-page-without-a-menu-entry-marks-the-entry-it-names
 */
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const manifest = (postvak) => ({
	version: '1.0.0',
	pages: [
		{ id: 'Cases', route: '/cases' },
		{ id: 'Postvak', route: '/postvak', ...postvak },
		{ id: 'Board', route: '/board' },
	],
	menu: [
		{ id: 'Queue', label: 'Team queue', route: 'Cases', query: { savedView: 'default:team-queue' }, order: 1 },
		{ id: 'Cases', label: 'All cases', route: 'Cases', order: 2 },
		{ id: 'Board', label: 'Board', route: 'Board', order: 3 },
	],
})

/**
 * The ids of the entries marked current on a route.
 *
 * @param {object} m The manifest.
 * @param {object} route The route.
 * @return {string[]} The marked entries.
 */
function active(m, route) {
	const wrapper = mount(CnAppNav, {
		global: { provide: { cnManifest: m, cnTranslate: (k) => k }, mocks: { $route: reactive(route) } },
	})
	return m.menu.filter((entry) => wrapper.vm.isActive(entry)).map((entry) => entry.id)
}

describe('CnAppNav: a page names its menu entry', () => {
	it('marks the entry the page names, and only that one', () => {
		expect(active(manifest({ menuEntry: 'Queue' }), { name: 'Postvak', path: '/postvak', query: {} })).toEqual(['Queue'])
	})

	it('marks nothing for a page that names no entry, as before', () => {
		expect(active(manifest({}), { name: 'Postvak', path: '/postvak', query: {} })).toEqual([])
	})

	it('leaves the usual rules alone on the pages the menu links', () => {
		const m = manifest({ menuEntry: 'Queue' })
		expect(active(m, { name: 'Board', path: '/board', query: {} })).toEqual(['Board'])
		expect(active(m, { name: 'Cases', path: '/cases', query: {} })).toEqual(['Cases'])
	})
})
