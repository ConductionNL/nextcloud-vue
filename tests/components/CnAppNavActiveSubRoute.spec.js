/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppNav on a page BELOW a list (a detail page under `/cases`).
 *
 * Since the query rule, an entry with a `query` is active only when the
 * address carries that query. On `/cases/123` the address carries the detail
 * page's query, so on a list whose entries ALL have a `query` ("My work",
 * "Queue") none was marked and the menu showed no place at all.
 *
 * The rule under test marks exactly ONE entry there: the one the reader last
 * had active on that list, else the first in menu order. Marking all of them
 * is the defect the query rule ended, so every test here also counts.
 *
 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
 */
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const PAGES = [
	{ id: 'Cases', route: '/cases' },
	{ id: 'CaseDetail', route: '/cases/:id' },
	{ id: 'Board', route: '/board' },
]

/** Every entry on the Cases list carries a query. */
const ALL_WITH_QUERY = {
	version: '1.0.0',
	pages: PAGES,
	menu: [
		{ id: 'mine', label: 'My work', route: 'Cases', query: { assignee: 'me' }, order: 1 },
		{ id: 'queue', label: 'Queue', route: 'Cases', query: { assignee: 'none' }, order: 2 },
		{ id: 'board', label: 'Board', route: 'Board', order: 3 },
	],
}

/** One entry on the Cases list has no query. */
const ONE_WITHOUT_QUERY = {
	version: '1.0.0',
	pages: PAGES,
	menu: [
		{ id: 'mine', label: 'My work', route: 'Cases', query: { assignee: 'me' }, order: 1 },
		{ id: 'all', label: 'All cases', route: 'Cases', order: 2 },
		{ id: 'board', label: 'Board', route: 'Board', order: 3 },
	],
}

/** The list entries sit in a group, as children. */
const IN_A_GROUP = {
	version: '1.0.0',
	pages: PAGES,
	menu: [
		{
			id: 'work',
			label: 'Work',
			order: 1,
			children: [
				{ id: 'mine', label: 'My work', route: 'Cases', query: { assignee: 'me' }, order: 1 },
				{ id: 'queue', label: 'Queue', route: 'Cases', query: { assignee: 'none' }, order: 2 },
			],
		},
	],
}

const LIST = (query = {}) => ({ name: 'Cases', path: '/cases', query })
const DETAIL = (query = {}) => ({ name: 'CaseDetail', path: '/cases/123', query })

/**
 * Mount the nav on a route that can be changed afterwards.
 *
 * @param {object} manifest The manifest.
 * @param {object} start The first route.
 * @return {{ wrapper: object, go: (route: object) => Promise<void>, active: () => string[] }} The handle.
 */
function mountNav(manifest, start) {
	const $route = reactive({ ...start })
	const wrapper = mount(CnAppNav, {
		global: { provide: { cnManifest: manifest, cnTranslate: (k) => k }, mocks: { $route } },
	})
	const entries = manifest.menu.flatMap((item) => [item, ...(item.children ?? [])])
	return {
		wrapper,
		async go(route) {
			Object.assign($route, route)
			await nextTick()
		},
		active: () => entries.filter((entry) => wrapper.vm.isActive(entry)).map((entry) => entry.id),
	}
}

describe('CnAppNav on a page below a list', () => {
	it('a cold load of a detail page marks the first entry of the list, and only that one', () => {
		const nav = mountNav(ALL_WITH_QUERY, DETAIL())
		expect(nav.active()).toEqual(['mine'])
	})

	it('keeps the entry the reader came from', async () => {
		const nav = mountNav(ALL_WITH_QUERY, LIST({ assignee: 'none' }))
		expect(nav.active()).toEqual(['queue'])

		await nav.go(DETAIL())
		expect(nav.active()).toEqual(['queue'])
	})

	it('follows the reader: the last list entry used wins, not the first one used', async () => {
		const nav = mountNav(ALL_WITH_QUERY, LIST({ assignee: 'none' }))
		await nav.go(LIST({ assignee: 'me' }))
		await nav.go(DETAIL())
		expect(nav.active()).toEqual(['mine'])

		await nav.go(LIST({ assignee: 'none' }))
		await nav.go(DETAIL())
		expect(nav.active()).toEqual(['queue'])
	})

	it('a visit to another route does not forget the list entry', async () => {
		const nav = mountNav(ALL_WITH_QUERY, LIST({ assignee: 'none' }))
		await nav.go({ name: 'Board', path: '/board', query: {} })
		expect(nav.active()).toEqual(['board'])

		await nav.go(DETAIL())
		expect(nav.active()).toEqual(['queue'])
	})

	it('never marks two entries, whatever the detail address carries', async () => {
		const nav = mountNav(ALL_WITH_QUERY, DETAIL({ tab: 'documents' }))
		expect(nav.active()).toHaveLength(1)

		// A detail address that happens to carry a list query: the query
		// rule marks that entry, and the fallback stays out of it.
		await nav.go(DETAIL({ assignee: 'none' }))
		expect(nav.active()).toEqual(['queue'])
	})

	it('leaves a list with an entry without a query as it was', async () => {
		const nav = mountNav(ONE_WITHOUT_QUERY, LIST({ assignee: 'me' }))
		expect(nav.active()).toEqual(['mine'])

		// Before and after this change: the entry without a query is the
		// one marked below the list.
		await nav.go(DETAIL())
		expect(nav.active()).toEqual(['all'])
	})

	it('on the list itself an address no entry describes still marks none', () => {
		// Not a page below the list, so the fallback does not apply.
		const nav = mountNav(ALL_WITH_QUERY, LIST({ sort: 'name' }))
		expect(nav.active()).toEqual([])
	})

	it('works for entries inside a group, and opens the group', () => {
		const nav = mountNav(IN_A_GROUP, DETAIL())
		expect(nav.active()).toEqual(['mine'])
		expect(nav.wrapper.vm.hasActiveChild(IN_A_GROUP.menu[0])).toBe(true)
	})
})
