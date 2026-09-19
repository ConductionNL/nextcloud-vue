/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view as a place: the route, the presentation and the pin.
 *
 * Three of these assertions exist because the failure they catch is silent.
 *
 * `resolveViewPresentation` translates OpenRegister's `viewType` into
 * CnIndexPage's `viewMode`, and the two vocabularies disagree on one word:
 * OpenRegister stores `kanban`, the index page renders `board`. A view asking
 * for a board on a page that offers one would fall through to the table with
 * nothing in the UI to say why, which reads as "the board is broken".
 *
 * `isPinnedView` reads `favoredBy`, spelled the way OpenRegister's View
 * entity spells it. `favoritedBy` appears in one of its own setter docblocks,
 * and a near-miss there is a pin that saves and never shows.
 *
 * `withPinnedViewChildren` must never produce a TOP-LEVEL entry. A pinned
 * view whose page has no menu entry contributes nothing rather than inventing
 * one: an entry invented there is exactly the navigation budget (ADR-097)
 * being spent by a user instead of by the app.
 *
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */

import {
	DEFAULT_PINNED_VIEW_CAP,
	isPinnedView,
	pageHasSavedViewPlaces,
	pinnedViewNavChildren,
	resolveViewPresentation,
	savedViewRouteBase,
	savedViewRouteName,
	savedViewRoutePath,
	savedViewRouteTarget,
	togglePinnedBy,
	viewIdForRoute,
	withPinnedViewChildren,
} from '../../src/utils/savedViewPlaces.js'

const CASES = {
	id: 'Cases',
	type: 'index',
	route: '/cases',
	savedViewPlaces: { enabled: true, routeBase: 'views' },
}

/**
 * A view as `GET /apps/openregister/api/views` returns one.
 *
 * @param {object} overrides Fields to change.
 * @return {object} The view.
 */
function view(overrides = {}) {
	return { id: 42, name: 'Overdue', owner: 'alice', favoredBy: [], presentation: { viewType: 'table' }, query: {}, ...overrides }
}

describe('a page declares that its views are places', () => {
	it('needs the key AND enabled AND an index page', () => {
		expect(pageHasSavedViewPlaces(CASES)).toBe(true)
		expect(pageHasSavedViewPlaces({ ...CASES, savedViewPlaces: { enabled: false } })).toBe(false)
		expect(pageHasSavedViewPlaces({ ...CASES, savedViewPlaces: undefined })).toBe(false)
		expect(pageHasSavedViewPlaces({ ...CASES, type: 'detail' })).toBe(false)
		expect(pageHasSavedViewPlaces(null)).toBe(false)
	})

	it('falls back to the default route base rather than an empty segment', () => {
		expect(savedViewRouteBase(CASES)).toBe('views')
		expect(savedViewRouteBase({ ...CASES, savedViewPlaces: { enabled: true } })).toBe('views')
		expect(savedViewRouteBase({ ...CASES, savedViewPlaces: { enabled: true, routeBase: '/lenses/' } })).toBe('lenses')
	})
})

describe('a view has a route of its own', () => {
	it('names the route after the page', () => {
		expect(savedViewRouteName('Cases')).toBe('Cases__view')
	})

	it('builds the path under the page it belongs to', () => {
		expect(savedViewRoutePath('/cases', 'views')).toBe('/cases/views/:viewId')
		expect(savedViewRoutePath('/cases/', 'views')).toBe('/cases/views/:viewId')
	})

	it('renames the param when the page already binds viewId', () => {
		// Two params of one name in one path: vue-router keeps the last and
		// drops the first without a word, and the wrong view opens.
		expect(savedViewRoutePath('/reports/:viewId', 'views')).toBe('/reports/:viewId/views/:savedViewId')
	})

	it('reads the view id off a view route only', () => {
		expect(viewIdForRoute({ meta: { cnSavedViewOf: 'Cases' }, params: { viewId: '42' } })).toBe('42')
		expect(viewIdForRoute({ meta: { cnSavedViewOf: 'Cases' }, params: { savedViewId: 7 } })).toBe('7')
		expect(viewIdForRoute({ meta: { cnPageId: 'Cases' }, params: { viewId: '42' } })).toBeNull()
		expect(viewIdForRoute({ meta: { cnSavedViewOf: 'Cases' }, params: {} })).toBeNull()
	})

	it('targets a view by id, and nothing at all on a page without places', () => {
		expect(savedViewRouteTarget(CASES, view())).toEqual({ name: 'Cases__view', params: { viewId: '42' } })
		expect(savedViewRouteTarget({ ...CASES, savedViewPlaces: { enabled: false } }, view())).toBeNull()
		expect(savedViewRouteTarget(CASES, { name: 'no id' })).toBeNull()
	})
})

describe('a view opens in the presentation it declares', () => {
	it('translates OpenRegister kanban into the index page board', () => {
		const result = resolveViewPresentation(view({ presentation: { viewType: 'kanban' } }), ['table', 'board'])
		expect(result.viewMode).toBe('board')
		expect(result.warnings).toEqual([])
	})

	it('falls through to the next declared presentation and warns once', () => {
		const result = resolveViewPresentation(
			view({ presentation: { viewType: 'timeline', viewTypes: ['timeline', 'table'] } }),
			['table', 'cards'],
		)
		expect(result.viewMode).toBe('table')
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain('timeline')
	})

	it("opens the page's own first mode when the view declares nothing renderable", () => {
		const result = resolveViewPresentation(view({ presentation: null }), ['cards', 'table'])
		expect(result.viewMode).toBe('cards')
	})

	it('offers nothing rather than guessing when the page registered no modes', () => {
		expect(resolveViewPresentation(view(), []).viewMode).toBeNull()
	})
})

describe('pinning is the favourite flag OpenRegister already keeps', () => {
	it('reads favoredBy, and only for this user', () => {
		expect(isPinnedView(view({ favoredBy: ['alice'] }), 'alice')).toBe(true)
		expect(isPinnedView(view({ favoredBy: ['bob'] }), 'alice')).toBe(false)
		expect(isPinnedView(view({ favoredBy: ['alice'] }), '')).toBe(false)
	})

	it('is idempotent in both directions', () => {
		expect(togglePinnedBy(view({ favoredBy: ['alice'] }), 'alice', true)).toEqual(['alice'])
		expect(togglePinnedBy(view({ favoredBy: [] }), 'alice', false)).toEqual([])
		expect(togglePinnedBy(view({ favoredBy: ['bob'] }), 'alice', true)).toEqual(['bob', 'alice'])
		expect(togglePinnedBy(view({ favoredBy: ['bob', 'alice'] }), 'alice', false)).toEqual(['bob'])
	})
})

describe('a pinned view takes a place under its page', () => {
	const pinned = (n) => view({ id: n, name: `View ${n}`, favoredBy: ['alice'] })

	it('renders one child per pinned view, pointing at its route', () => {
		const children = pinnedViewNavChildren(CASES, [pinned(1), view({ id: 2 })], 'alice')
		expect(children).toHaveLength(1)
		expect(children[0]).toMatchObject({ id: 'Cases-view-1', label: 'View 1', route: 'Cases__view', params: { viewId: '1' } })
	})

	it('stops at the cap, leaving the rest to the page itself', () => {
		const many = Array.from({ length: 8 }, (_, i) => pinned(i + 1))
		expect(pinnedViewNavChildren(CASES, many, 'alice')).toHaveLength(DEFAULT_PINNED_VIEW_CAP)
		expect(pinnedViewNavChildren({ ...CASES, savedViewPlaces: { enabled: true, pinnedCap: 2 } }, many, 'alice')).toHaveLength(2)
	})

	it('hangs the children under the entry that points at the page', () => {
		const menu = [{ id: 'nav-cases', label: 'Cases', route: 'Cases' }, { id: 'nav-tasks', label: 'Tasks', route: 'Tasks' }]
		const merged = withPinnedViewChildren(menu, { manifest: { pages: [CASES] }, views: [pinned(1)], userId: 'alice' })
		expect(merged).toHaveLength(2)
		expect(merged[0].children).toHaveLength(1)
		expect(merged[1].children).toBeUndefined()
		// The input menu is the manifest's; merging must not write into it.
		expect(menu[0].children).toBeUndefined()
	})

	it('hangs them under navGroup when the page names one', () => {
		const page = { ...CASES, savedViewPlaces: { enabled: true, navGroup: 'nav-work' } }
		const menu = [{ id: 'nav-work', label: 'Work' }, { id: 'nav-cases', route: 'Cases' }]
		const merged = withPinnedViewChildren(menu, { manifest: { pages: [page] }, views: [pinned(1)], userId: 'alice' })
		expect(merged[0].children).toHaveLength(1)
		expect(merged[1].children).toBeUndefined()
	})

	it('adds no entry at all when the page has none of its own', () => {
		const menu = [{ id: 'nav-tasks', route: 'Tasks' }]
		const merged = withPinnedViewChildren(menu, { manifest: { pages: [CASES] }, views: [pinned(1)], userId: 'alice' })
		expect(merged).toHaveLength(1)
		expect(merged[0].children).toBeUndefined()
	})

	it('keeps a group\'s declared children and appends the pins after them', () => {
		const menu = [{ id: 'nav-cases', route: 'Cases', children: [{ id: 'nav-cases-new', label: 'New case' }] }]
		const merged = withPinnedViewChildren(menu, { manifest: { pages: [CASES] }, views: [pinned(1)], userId: 'alice' })
		expect(merged[0].children.map((c) => c.id)).toEqual(['nav-cases-new', 'Cases-view-1'])
	})
})
