/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * buildManifestRoutes: a manifest's pages as route records, plus the second
 * record a split view needs.
 *
 * The property under test is not "a route was produced" but "the split route
 * mounts the SAME page as the list route". A split route that resolved to a
 * different page would still navigate, still render something, and still
 * pass a test that only counted records.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import {
	buildManifestRoutes,
	pageHasSplitView,
	pageIdForRoute,
	splitIdForRoute,
	splitRouteName,
	splitRoutePath,
} from '../../src/utils/buildManifestRoutes.js'

const CASES = {
	id: 'cases',
	route: '/cases',
	type: 'index',
	title: 'Cases',
	splitView: { enabled: true, breakpoint: 900 },
}
const CASE_DETAIL = { id: 'case-detail', route: '/cases/:id', type: 'detail', title: 'Case' }
const PLAIN_LIST = { id: 'tasks', route: '/tasks', type: 'index', title: 'Tasks' }

const VIEWED_LIST = {
	id: 'queue',
	route: '/queue',
	type: 'index',
	title: 'Queue',
	savedViewPlaces: { enabled: true, routeBase: 'views' },
}

const Renderer = { name: 'CnPageRenderer' }

describe('buildManifestRoutes', () => {
	it('maps every page to one record named by its id', () => {
		const routes = buildManifestRoutes({ pages: [PLAIN_LIST, CASE_DETAIL] }, { component: Renderer })

		expect(routes.map((r) => [r.name, r.path])).toEqual([
			['tasks', '/tasks'],
			['case-detail', '/cases/:id'],
		])
		expect(routes.every((r) => r.component === Renderer)).toBe(true)
	})

	it('emits a view record for a page whose saved views are places, mounting the same page', () => {
		const routes = buildManifestRoutes({ pages: [VIEWED_LIST, CASE_DETAIL] }, { component: Renderer })

		expect(routes.map((r) => [r.name, r.path])).toEqual([
			['queue', '/queue'],
			['queue__view', '/queue/views/:viewId'],
			['case-detail', '/cases/:id'],
		])
		// The property under test: the view route resolves to the SAME page.
		// A record that navigated somewhere else would still render, and a
		// test that only counted records could not tell the difference.
		expect(routes[1].meta).toEqual({ cnPageId: 'queue', cnSavedViewOf: 'queue' })
		expect(routes[1].component).toBe(Renderer)
	})

	it('emits no view record for a page that declared places and turned them off', () => {
		const off = { ...VIEWED_LIST, savedViewPlaces: { enabled: false } }
		expect(buildManifestRoutes({ pages: [off] }, { component: Renderer }).map((r) => r.name)).toEqual(['queue'])
	})

	it('emits both records for a page that is a split view AND a place for its views', () => {
		const both = { ...CASES, savedViewPlaces: { enabled: true } }
		expect(buildManifestRoutes({ pages: [both] }, { component: Renderer }).map((r) => r.path))
			.toEqual(['/cases', '/cases/views/:viewId', '/cases/split/:id'])
	})

	it('emits a second record for a page declaring splitView, directly after it', () => {
		const routes = buildManifestRoutes({ pages: [CASES, CASE_DETAIL] }, { component: Renderer })

		expect(routes.map((r) => r.name)).toEqual(['cases', 'cases__split', 'case-detail'])
		expect(routes[1].path).toBe('/cases/split/:id')
	})

	it('points the split record at the same page, so the list never unmounts', () => {
		const [list, split] = buildManifestRoutes({ pages: [CASES] }, { component: Renderer })

		expect(split.meta.cnPageId).toBe(list.meta.cnPageId)
		expect(split.component).toBe(list.component)
		expect(split.meta.cnSplitOf).toBe('cases')
		expect(split.meta.cnSplitBreakpoint).toBe(900)
	})

	it('emits no split record when the page turned the split view off', () => {
		const off = { ...CASES, splitView: { enabled: false, breakpoint: 900 } }

		expect(buildManifestRoutes({ pages: [off] }).map((r) => r.name)).toEqual(['cases'])
	})

	it('emits no split record for a detail page, whatever it declares', () => {
		const wrong = { ...CASE_DETAIL, splitView: { enabled: true } }

		expect(buildManifestRoutes({ pages: [wrong] }).map((r) => r.name)).toEqual(['case-detail'])
	})

	it('needs no record for tabInAddress, because the tab is a query parameter', () => {
		const tabbed = { ...CASE_DETAIL, tabInAddress: true }

		expect(buildManifestRoutes({ pages: [tabbed] }).map((r) => r.path)).toEqual(['/cases/:id'])
	})

	it('passes props through untouched and omits the key when none were given', () => {
		const props = { manifest: {}, customComponents: {} }

		expect(buildManifestRoutes({ pages: [CASES] }, { props })[0].props).toBe(props)
		expect('props' in buildManifestRoutes({ pages: [CASES] })[0]).toBe(false)
	})

	it('lets a host decorate a record, and keeps the record when the hook returns nothing', () => {
		const decorated = buildManifestRoutes({ pages: [PLAIN_LIST] }, {
			decorate: (page, record) => ({ ...record, beforeEnter: page.id }),
		})
		const forgetful = buildManifestRoutes({ pages: [PLAIN_LIST] }, { decorate: () => undefined })

		expect(decorated[0].beforeEnter).toBe('tasks')
		expect(forgetful[0].name).toBe('tasks')
	})

	it('skips a page with no id or no route rather than registering a broken record', () => {
		const routes = buildManifestRoutes({
			pages: [{ type: 'index', title: 'Nameless' }, { id: 'x', type: 'index', title: 'Pathless' }, PLAIN_LIST],
		})

		expect(routes.map((r) => r.name)).toEqual(['tasks'])
	})

	it.each([[null], [undefined], [{}], [{ pages: 'not an array' }]])('answers %p with an empty list', (input) => {
		expect(buildManifestRoutes(input)).toEqual([])
	})
})

describe('splitRoutePath', () => {
	it('appends the split segment and an id param', () => {
		expect(splitRoutePath('/cases')).toBe('/cases/split/:id')
	})

	it('trims a trailing slash so the path never doubles it', () => {
		expect(splitRoutePath('/cases/')).toBe('/cases/split/:id')
	})

	it('renames the param when the page path already binds id, so neither is dropped', () => {
		expect(splitRoutePath('/registers/:id/objects')).toBe('/registers/:id/objects/split/:splitId')
	})
})

describe('pageHasSplitView', () => {
	it.each([
		[CASES, true],
		[{ ...CASES, splitView: { enabled: false } }, false],
		[{ ...CASES, splitView: {} }, false],
		[PLAIN_LIST, false],
		[{ ...CASE_DETAIL, splitView: { enabled: true } }, false],
		[null, false],
	])('reads %p as %p', (page, expected) => {
		expect(pageHasSplitView(page)).toBe(expected)
	})
})

describe('pageIdForRoute', () => {
	it('prefers meta.cnPageId, so a split route resolves to its list page', () => {
		expect(pageIdForRoute({ name: 'cases__split', meta: { cnPageId: 'cases' } })).toBe('cases')
	})

	it('falls back to the route name, which is what a hand-written router has', () => {
		expect(pageIdForRoute({ name: 'cases' })).toBe('cases')
	})

	it.each([[{}], [{ name: '' }], [null]])('answers %p with null rather than a falsy id', (route) => {
		expect(pageIdForRoute(route)).toBeNull()
	})
})

describe('splitIdForRoute', () => {
	it('reads the id off a split route', () => {
		expect(splitIdForRoute({ meta: { cnSplitOf: 'cases' }, params: { id: '42' } })).toBe('42')
	})

	it('reads the renamed param when the page path already bound id', () => {
		expect(splitIdForRoute({ meta: { cnSplitOf: 'cases' }, params: { id: 'r1', splitId: '42' } })).toBe('42')
	})

	it('answers null on the list route itself, which carries no split marker', () => {
		expect(splitIdForRoute({ meta: { cnPageId: 'cases' }, params: { id: '42' } })).toBeNull()
	})

	it('answers null when the split route carries no id', () => {
		expect(splitIdForRoute({ meta: { cnSplitOf: 'cases' }, params: {} })).toBeNull()
	})
})

describe('splitRouteName', () => {
	it('is the page id plus the suffix', () => {
		expect(splitRouteName('cases')).toBe('cases__split')
	})
})
