/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppNav's active state respects `query`: two entries that share a route
 * and differ only in their query are never both marked.
 */
import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const manifest = {
	version: '1.0.0',
	pages: [{ id: 'Cases', route: '/cases' }, { id: 'Board', route: '/board' }],
	menu: [
		{ id: 'mine', label: 'My work', route: 'Cases', query: { assignee: 'me' }, order: 1 },
		{ id: 'queue', label: 'Queue', route: 'Cases', query: { assignee: 'none', page: 1 }, order: 2 },
		{ id: 'all', label: 'All cases', route: 'Cases', order: 3 },
		{ id: 'board', label: 'Board', route: 'Board', order: 4 },
	],
}

/**
 * @param {object} $route The current route.
 * @return {string[]} Ids of the entries marked active.
 */
function activeIds($route) {
	const wrapper = mount(CnAppNav, {
		global: { provide: { cnManifest: manifest, cnTranslate: (k) => k }, mocks: { $route } },
	})
	return manifest.menu.map((item) => item.id).filter((id) => wrapper.vm.isActive(manifest.menu.find((m) => m.id === id)))
}

describe('CnAppNav active state and query', () => {
	it('marks only the entry whose query the address carries', () => {
		expect(activeIds({ name: 'Cases', path: '/cases', query: { assignee: 'me' } })).toEqual(['mine'])
	})

	it('compares values as strings and needs every declared key', () => {
		expect(activeIds({ name: 'Cases', path: '/cases', query: { assignee: 'none', page: '1' } })).toEqual(['queue'])
		expect(activeIds({ name: 'Cases', path: '/cases', query: { assignee: 'none' } })).toEqual(['all'])
	})

	it('marks the entry without a query when no sibling query matches', () => {
		expect(activeIds({ name: 'Cases', path: '/cases', query: {} })).toEqual(['all'])
		expect(activeIds({ name: 'Cases', path: '/cases', query: { sort: 'name' } })).toEqual(['all'])
	})

	it('ignores extra keys in the address', () => {
		expect(activeIds({ name: 'Cases', path: '/cases', query: { assignee: 'me', sort: 'name' } })).toEqual(['mine'])
	})

	it('leaves entries on other routes as they were', () => {
		expect(activeIds({ name: 'Board', path: '/board', query: { assignee: 'me' } })).toEqual(['board'])
	})
})
