/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppNav's active state respects `params`: entries that share a
 * parameterised route and differ only in their params are never both marked,
 * on the route itself or on a page below it.
 */
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const manifest = {
	version: '1.0.0',
	pages: [
		{ id: 'Items', route: '/items/:slug' },
		{ id: 'ItemDetail', route: '/items/:slug/:id' },
		{ id: 'ItemByCatalog', route: '/items/:catalog/:id' },
		{ id: 'Tags', route: '/tags/:tag?' },
		{ id: 'TagItem', route: '/tags/:tag/item/:id' },
		{ id: 'Shelf', route: '/shelf/:shelf/:view?' },
		{ id: 'ShelfItem', route: '/shelf/:shelf/item/:id' },
		{ id: 'Board', route: '/board' },
	],
	menu: [
		{ id: 'news', label: 'News', route: 'Items', params: { slug: 'news' }, order: 1 },
		{
			id: 'more',
			label: 'More',
			order: 2,
			children: [
				{ id: 'sport', label: 'Sport', route: 'Items', params: { slug: 'sport' }, order: 1 },
				{ id: 'year', label: '2026', route: 'Items', params: { slug: 2026 }, order: 2 },
				{ id: 'sport-open', label: 'Open sport', route: 'Items', params: { slug: 'sport' }, query: { status: 'open' }, order: 3 },
			],
		},
		{ id: 'plus', label: 'Plus', route: 'Items', params: { slug: 'a+b' }, order: 3 },
		{ id: 'colon', label: 'Colon', route: 'Items', params: { slug: 'a:b' }, order: 4 },
		{ id: 'space', label: 'Space', route: 'Items', params: { slug: 'a b' }, order: 5 },
		{ id: 'red', label: 'Red', route: 'Tags', params: { tag: 'red' }, order: 6 },
		{ id: 'top', label: 'Top shelf', route: 'Shelf', params: { shelf: 'top' }, order: 7 },
		{ id: 'board', label: 'Board', route: 'Board', order: 8 },
	],
}

const entries = manifest.menu.flatMap((item) => [item, ...(item.children ?? [])])

/**
 * Mount the nav on a route that can be changed afterwards.
 *
 * @param {object} start The first route.
 * @return {{ wrapper: object, go: (route: object) => Promise<void>, active: () => string[] }} The handle.
 */
function mountNav(start) {
	const $route = reactive({ query: {}, params: {}, ...start })
	const wrapper = mount(CnAppNav, {
		global: { provide: { cnManifest: manifest, cnTranslate: (k) => k }, mocks: { $route } },
	})
	return {
		wrapper,
		async go(route) {
			Object.assign($route, { query: {}, params: {} }, route)
			await nextTick()
		},
		active: () => entries.filter((entry) => wrapper.vm.isActive(entry)).map((entry) => entry.id),
	}
}

/**
 * @param {object} $route The current route.
 * @return {string[]} Ids of the entries marked active.
 */
const activeOn = ($route) => mountNav($route).active()

// Paths are written the way the router builds them: param values
// percent-encoded, params themselves plain.
const LIST = (slug, path = `/items/${slug}`, query = {}) => ({ name: 'Items', path, params: { slug }, query })
const DETAIL = (slug, path = `/items/${slug}/7`) => ({ name: 'ItemDetail', path, params: { slug, id: '7' } })

describe('CnAppNav active state and params', () => {
	it('marks only the entry whose params the route carries', () => {
		expect(activeOn(LIST('news'))).toEqual(['news'])
	})

	it('compares values as strings', () => {
		expect(activeOn(LIST('2026'))).toEqual(['year'])
	})

	it('needs the query too when an entry declares both, and leaves the params-only sibling marked', () => {
		expect(activeOn(LIST('sport'))).toEqual(['sport'])
		expect(activeOn(LIST('sport', '/items/sport', { status: 'open' }))).toEqual(['sport', 'sport-open'])
	})

	it('marks no entry for a param value none of them declares', () => {
		expect(activeOn(LIST('weather'))).toEqual([])
	})

	it('leaves entries without params as they were', () => {
		expect(activeOn({ name: 'Board', path: '/board', params: { slug: 'news' } })).toEqual(['board'])
	})

	it('opens the group whose child carries the matching params', () => {
		const { wrapper } = mountNav(LIST('sport'))
		expect(wrapper.vm.hasActiveChild(manifest.menu[1])).toBe(true)
	})

	it('moves the mark when the route changes on a mounted nav', async () => {
		const nav = mountNav(LIST('news'))
		expect(nav.active()).toEqual(['news'])

		await nav.go(LIST('sport'))
		expect(nav.active()).toEqual(['sport'])

		await nav.go(DETAIL('news'))
		expect(nav.active()).toEqual(['news'])

		await nav.go({ name: 'Board', path: '/board' })
		expect(nav.active()).toEqual(['board'])
	})

	it('matches values the router encodes in the path', () => {
		expect(activeOn(LIST('a+b'))).toEqual(['plus'])
		expect(activeOn(LIST('a:b'))).toEqual(['colon'])
		expect(activeOn(LIST('a b', '/items/a%20b'))).toEqual(['space'])
	})
})

describe('CnAppNav params on a page below the route', () => {
	it('marks the entry whose filled-in page path the detail page sits below', () => {
		expect(activeOn(DETAIL('news'))).toEqual(['news'])
		expect(activeOn(DETAIL('sport'))).toEqual(['sport'])
	})

	it('marks nothing below a param value no entry declares', () => {
		expect(activeOn(DETAIL('weather'))).toEqual([])
	})

	it('matches encoded values below the route', () => {
		expect(activeOn(DETAIL('a+b'))).toEqual(['plus'])
		expect(activeOn(DETAIL('a:b'))).toEqual(['colon'])
		expect(activeOn(DETAIL('a b', '/items/a%20b/7'))).toEqual(['space'])
	})

	it('picks the entry by path when the page below names its param differently', () => {
		// `ItemByCatalog` carries `catalog`, not `slug`, so the params check
		// marks nothing and the one entry below the route is picked. Only
		// entries whose filled-in path the address sits below qualify, so
		// `news`, first in menu order, is not it.
		expect(activeOn({ name: 'ItemByCatalog', path: '/items/sport/7', params: { catalog: 'sport', id: '7' } })).toEqual(['sport'])
		expect(activeOn({ name: 'ItemByCatalog', path: '/items/weather/7', params: { catalog: 'weather', id: '7' } })).toEqual([])
	})

	it('fills an optional segment from params', () => {
		expect(activeOn({ name: 'TagItem', path: '/tags/red/item/3', params: { tag: 'red', id: '3' } })).toEqual(['red'])
		expect(activeOn({ name: 'TagItem', path: '/tags/blue/item/3', params: { tag: 'blue', id: '3' } })).toEqual([])
	})

	it('drops an optional segment the entry has no param for', () => {
		// `top` fills `/shelf/:shelf/:view?` without `view`, so its page path
		// is `/shelf/top` and the item page below it qualifies.
		expect(activeOn({ name: 'ShelfItem', path: '/shelf/top/item/3', params: { shelf: 'top', id: '3' } })).toEqual(['top'])
		expect(activeOn({ name: 'ShelfItem', path: '/shelf/low/item/3', params: { shelf: 'low', id: '3' } })).toEqual([])
	})

	it('keeps a malformed encoded segment as is and marks nothing for it', () => {
		expect(() => activeOn(DETAIL('%E0', '/items/%E0/7'))).not.toThrow()
		expect(activeOn(DETAIL('%E0', '/items/%E0/7'))).toEqual([])
		expect(activeOn({ name: 'ItemByCatalog', path: '/items/%E0/7', params: { catalog: '%E0', id: '7' } })).toEqual([])
	})
})
