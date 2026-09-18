/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the saved-views-ui pure helpers: view state ↔ route query ↔
 * OpenRegister View payload serialization, plus the ownership gate.
 */

import {
	buildRouteQueryFromViewState,
	buildViewCreatePayload,
	extractViewState,
	extractViewStateFromRouteQuery,
	isOwnView,
	savedViewScope,
	schemaSlug,
	viewMatchesScope,
} from '../../src/utils/savedViewHelpers.js'

describe('extractViewStateFromRouteQuery', () => {
	it('returns the empty state for null/undefined/non-object query', () => {
		const empty = { filters: {}, search: '', sortKey: null, sortOrder: 'asc' }
		expect(extractViewStateFromRouteQuery(null)).toEqual(empty)
		expect(extractViewStateFromRouteQuery(undefined)).toEqual(empty)
		expect(extractViewStateFromRouteQuery('status=open')).toEqual(empty)
		expect(extractViewStateFromRouteQuery(['status'])).toEqual(empty)
	})

	it('collects non-underscore keys as filters, passing values through as-is', () => {
		const state = extractViewStateFromRouteQuery({ status: 'open', tags: ['a', 'b'] })
		expect(state.filters).toEqual({ status: 'open', tags: ['a', 'b'] })
	})

	it('skips reserved underscore keys from the filter map', () => {
		const state = extractViewStateFromRouteQuery({ status: 'open', _page: '3', _limit: '50' })
		expect(state.filters).toEqual({ status: 'open' })
	})

	it('skips null/undefined/empty-string filter values', () => {
		const state = extractViewStateFromRouteQuery({ a: '', b: null, c: undefined, d: 'keep' })
		expect(state.filters).toEqual({ d: 'keep' })
	})

	it('maps _search onto the search field', () => {
		expect(extractViewStateFromRouteQuery({ _search: 'urgent' }).search).toBe('urgent')
		expect(extractViewStateFromRouteQuery({}).search).toBe('')
	})

	it('maps _sortKey/_sortOrder onto sort, defaulting order to asc', () => {
		expect(extractViewStateFromRouteQuery({ _sortKey: 'name', _sortOrder: 'desc' }))
			.toMatchObject({ sortKey: 'name', sortOrder: 'desc' })
		expect(extractViewStateFromRouteQuery({ _sortKey: 'name' }))
			.toMatchObject({ sortKey: 'name', sortOrder: 'asc' })
		expect(extractViewStateFromRouteQuery({ _sortKey: 'name', _sortOrder: 'bogus' }))
			.toMatchObject({ sortKey: 'name', sortOrder: 'asc' })
	})

	it('ignores _sortOrder without a _sortKey', () => {
		expect(extractViewStateFromRouteQuery({ _sortOrder: 'desc' }))
			.toMatchObject({ sortKey: null, sortOrder: 'asc' })
	})
})

describe('buildRouteQueryFromViewState', () => {
	it('returns an empty query for empty/malformed state', () => {
		expect(buildRouteQueryFromViewState({})).toEqual({})
		expect(buildRouteQueryFromViewState(null)).toEqual({})
		expect(buildRouteQueryFromViewState({ filters: 'nope' })).toEqual({})
		expect(buildRouteQueryFromViewState({ filters: ['nope'] })).toEqual({})
	})

	it('spreads filters, skipping null/undefined/empty-string values', () => {
		const query = buildRouteQueryFromViewState({ filters: { status: 'open', a: '', b: null, tags: ['x', 'y'] } })
		expect(query).toEqual({ status: 'open', tags: ['x', 'y'] })
	})

	it('sets _search only for a non-empty search term', () => {
		expect(buildRouteQueryFromViewState({ search: 'urgent' })).toEqual({ _search: 'urgent' })
		expect(buildRouteQueryFromViewState({ search: '' })).toEqual({})
	})

	it('sets _sortKey/_sortOrder only when sortKey is truthy, defaulting order to asc', () => {
		expect(buildRouteQueryFromViewState({ sortKey: 'name', sortOrder: 'desc' }))
			.toEqual({ _sortKey: 'name', _sortOrder: 'desc' })
		expect(buildRouteQueryFromViewState({ sortKey: 'name', sortOrder: 'bogus' }))
			.toEqual({ _sortKey: 'name', _sortOrder: 'asc' })
		expect(buildRouteQueryFromViewState({ sortKey: null, sortOrder: 'desc' })).toEqual({})
	})

	it('never includes _page — applying a view resets pagination implicitly', () => {
		const query = buildRouteQueryFromViewState({ filters: { status: 'open' }, search: 'x', sortKey: 'name' })
		expect(Object.keys(query)).not.toContain('_page')
	})
})

describe('buildViewCreatePayload', () => {
	it('builds the exact OR views POST body', () => {
		expect(buildViewCreatePayload({
			name: 'My open cases',
			description: 'desc',
			isPublic: true,
			isDefault: false,
			state: { filters: { status: 'open' }, search: 'urgent', sortKey: 'name', sortOrder: 'desc' },
		})).toEqual({
			name: 'My open cases',
			description: 'desc',
			isPublic: true,
			isDefault: false,
			query: {
				filters: { status: 'open' },
				search: 'urgent',
				sort: { key: 'name', order: 'desc' },
			},
		})
	})

	it('defaults description/isPublic/isDefault and serializes no-sort as null', () => {
		expect(buildViewCreatePayload({ name: 'n', state: { filters: {}, search: '' } })).toEqual({
			name: 'n',
			description: '',
			isPublic: false,
			isDefault: false,
			query: { filters: {}, search: '', sort: null },
		})
	})

	it('degrades a malformed state defensively', () => {
		expect(buildViewCreatePayload({ name: 'n', state: null }).query)
			.toEqual({ filters: {}, search: '', sort: null })
		expect(buildViewCreatePayload({ name: 'n', state: { filters: ['x'], search: 42 } }).query)
			.toEqual({ filters: {}, search: '', sort: null })
		expect(buildViewCreatePayload().query).toEqual({ filters: {}, search: '', sort: null })
	})

	it('defaults a bogus sortOrder to asc', () => {
		expect(buildViewCreatePayload({ name: 'n', state: { sortKey: 'name', sortOrder: 'sideways' } }).query.sort)
			.toEqual({ key: 'name', order: 'asc' })
	})
})

describe('extractViewState', () => {
	it('returns the empty state for null/undefined/non-object views', () => {
		const empty = { filters: {}, search: '', sortKey: null, sortOrder: 'asc' }
		expect(extractViewState(null)).toEqual(empty)
		expect(extractViewState(undefined)).toEqual(empty)
		expect(extractViewState('view')).toEqual(empty)
		expect(extractViewState([])).toEqual(empty)
	})

	it('returns the empty state when view.query is missing or malformed', () => {
		const empty = { filters: {}, search: '', sortKey: null, sortOrder: 'asc' }
		expect(extractViewState({ id: 1, name: 'v', query: null })).toEqual(empty)
		expect(extractViewState({ id: 1, name: 'v', query: 'oops' })).toEqual(empty)
		expect(extractViewState({ id: 1, name: 'v', query: [] })).toEqual(empty)
	})

	it('reads filters/search/sort from a full view object', () => {
		expect(extractViewState({
			id: 1,
			owner: 'alice',
			query: { filters: { status: 'open' }, search: 'urgent', sort: { key: 'name', order: 'desc' } },
		})).toEqual({ filters: { status: 'open' }, search: 'urgent', sortKey: 'name', sortOrder: 'desc' })
	})

	it('accepts a raw query blob directly (no `query` wrapper)', () => {
		expect(extractViewState({ filters: { status: 'open' }, search: '', sort: null }))
			.toEqual({ filters: { status: 'open' }, search: '', sortKey: null, sortOrder: 'asc' })
	})

	it('degrades malformed sub-fields: non-object filters, sort without key, bogus order', () => {
		expect(extractViewState({ query: { filters: ['x'] } }).filters).toEqual({})
		expect(extractViewState({ query: { sort: { order: 'desc' } } }).sortKey).toBeNull()
		expect(extractViewState({ query: { sort: { key: 'name', order: 'sideways' } } }).sortOrder).toBe('asc')
		expect(extractViewState({ query: { sort: ['name'] } }).sortKey).toBeNull()
	})

	it('skips empty filter values from the stored view', () => {
		expect(extractViewState({ query: { filters: { a: '', b: null, c: 'keep' } } }).filters)
			.toEqual({ c: 'keep' })
	})

	it('round-trips: state → payload query → state', () => {
		const state = { filters: { status: 'open', tags: ['a', 'b'] }, search: 'urgent', sortKey: 'created', sortOrder: 'desc' }
		const payload = buildViewCreatePayload({ name: 'rt', state })
		expect(extractViewState({ query: payload.query })).toEqual(state)
	})

	it('round-trips: route query → state → route query', () => {
		const query = { status: 'open', _search: 'urgent', _sortKey: 'created', _sortOrder: 'desc' }
		const state = extractViewStateFromRouteQuery(query)
		expect(buildRouteQueryFromViewState(state)).toEqual(query)
	})
})

describe('isOwnView', () => {
	it('is true only when the view owner matches the user id', () => {
		expect(isOwnView({ owner: 'alice' }, 'alice')).toBe(true)
		expect(isOwnView({ owner: 'bob' }, 'alice')).toBe(false)
	})

	it('is null-safe on both sides', () => {
		expect(isOwnView(null, 'alice')).toBe(false)
		expect(isOwnView({ owner: 'alice' }, null)).toBe(false)
		expect(isOwnView({ owner: 'alice' }, '')).toBe(false)
		expect(isOwnView({}, 'alice')).toBe(false)
	})
})

describe('savedViewScope', () => {
	it('names the register and schema by default', () => {
		expect(savedViewScope({ register: 'dossiq', schema: 'case' })).toBe('dossiq/case')
		expect(savedViewScope({ register: 'dossiq', schema: { slug: 'case' } })).toBe('dossiq/case')
	})

	it('lets an explicit scope override the source', () => {
		expect(savedViewScope({ scope: 'cases', register: 'dossiq', schema: 'case' })).toBe('cases')
	})

	it('is empty for a page with no source', () => {
		expect(savedViewScope({})).toBe('')
		expect(savedViewScope({ register: 'dossiq' })).toBe('')
		expect(savedViewScope({ schema: 'case' })).toBe('')
	})
})

describe('buildViewCreatePayload scope', () => {
	it('writes the scope and the source into the query blob', () => {
		const payload = buildViewCreatePayload({
			name: 'Open',
			state: { filters: { status: 'open' } },
			scope: 'dossiq/case',
			register: 'dossiq',
			schema: { slug: 'case' },
		})
		expect(payload.query).toEqual({
			filters: { status: 'open' },
			search: '',
			sort: null,
			scope: 'dossiq/case',
			registers: ['dossiq'],
			schemas: ['case'],
		})
	})

	it('leaves the blob as it was for a page with no source', () => {
		const payload = buildViewCreatePayload({ name: 'Open', state: {} })
		expect(payload.query).toEqual({ filters: {}, search: '', sort: null })
	})
})

describe('viewMatchesScope', () => {
	const casesPage = { register: 'dossiq', schema: { slug: 'case' } }
	const organisationsPage = { register: 'dossiq', schema: { slug: 'kvkCompany' } }

	it('shows a scoped view on the pages sharing its scope and nowhere else', () => {
		const view = { query: { filters: {}, scope: 'dossiq/case' } }
		expect(viewMatchesScope(view, casesPage)).toBe(true)
		expect(viewMatchesScope(view, { ...casesPage, scope: '' })).toBe(true)
		expect(viewMatchesScope(view, organisationsPage)).toBe(false)
		expect(viewMatchesScope(view, {})).toBe(false)
	})

	it('honours an explicit page scope over the source', () => {
		const view = { query: { scope: 'cases' } }
		expect(viewMatchesScope(view, { ...organisationsPage, scope: 'cases' })).toBe(true)
		expect(viewMatchesScope(view, casesPage)).toBe(false)
	})

	it("matches OpenRegister's own views by their schemas", () => {
		const view = { query: { schemas: ['case'], registers: ['dossiq'], facetFilters: {} } }
		expect(viewMatchesScope(view, casesPage)).toBe(true)
		expect(viewMatchesScope(view, organisationsPage)).toBe(false)
		expect(viewMatchesScope(view, { register: 'other', schema: 'case' })).toBe(false)
		expect(viewMatchesScope({ query: { schemas: ['case'] } }, { register: 'other', schema: 'case' })).toBe(true)
	})

	it('keeps a view saved before scoping visible everywhere', () => {
		const legacy = { query: { filters: { status: 'open' }, search: '', sort: null } }
		expect(viewMatchesScope(legacy, casesPage)).toBe(true)
		expect(viewMatchesScope(legacy, organisationsPage)).toBe(true)
		expect(viewMatchesScope({ query: null }, casesPage)).toBe(true)
		expect(viewMatchesScope(null, casesPage)).toBe(true)
	})
})

describe('schemaSlug', () => {
	it('reads a slug from a string or a schema object, and nothing else', () => {
		expect(schemaSlug('case')).toBe('case')
		expect(schemaSlug({ slug: 'case' })).toBe('case')
		expect(schemaSlug({ title: 'Case' })).toBe('')
		expect(schemaSlug(null)).toBe('')
	})
})
