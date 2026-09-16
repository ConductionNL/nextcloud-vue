/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * The half of a search field a unit test of the mapping cannot see: who
 * HOLDS the choice on a manifest page, and whether the link carries it.
 *
 * `activeFilters` is a prop. A consumer-managed page fills it; a manifest
 * page has no consumer, so before this the sidebar on a named-source index
 * emitted into nothing. These tests hold the page to keeping its own state
 * and to writing it into the URL, because a filtered list you cannot send to
 * a colleague is half a feature.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ data: { results: [], total: 0 } }) },
}))

const taskSchema = {
	title: 'Tasks',
	properties: {
		objectUuid: { type: 'string', title: 'Case', facetable: true, order: 1, inputControl: 'reference' },
		state: { type: 'string', title: 'State', facetable: true, order: 2, inputControl: 'multiselect', enum: ['available', 'active'] },
		dueAt: { type: 'string', title: 'Due between', facetable: true, order: 3, inputControl: 'date-range' },
		notAFilter: { type: 'string', title: 'Title' },
	},
}

/**
 * Mount the index page over the tasks source with a fake router.
 *
 * @param {object} [query] The starting `$route.query`.
 *
 * @return {object} `{ wrapper, replace }`.
 */
function mountTasksPage(query = {}) {
	const replace = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnIndexPage, {
		propsData: {
			title: 'Tasks',
			entitySource: 'tasks',
			schema: taskSchema,
			sidebar: { enabled: true },
		},
		global: {
			mocks: {
				$route: { query, params: {}, path: '/tasks' },
				$router: { replace },
			},
		},
		mocks: {
			$route: { query, params: {}, path: '/tasks' },
			$router: { replace },
		},
		stubs: {
			CnDataTable: true,
			CnCardGrid: true,
			CnPagination: true,
			CnActionsBar: true,
			CnContextMenu: true,
			CnIndexSidebar: true,
		},
	})
	return { wrapper, replace }
}

describe('a named-source page holds its own sidebar filters', () => {
	it('records a choice the sidebar emits', async () => {
		const { wrapper } = mountTasksPage()

		wrapper.vm.onFilterEvent({ key: 'state', values: ['active'] })

		expect(wrapper.vm.namedActiveFilters).toEqual({ state: ['active'] })
		expect(wrapper.vm.effectiveActiveFilters).toEqual({ state: ['active'] })
	})

	it('drops a field again when its last value is cleared', async () => {
		const { wrapper } = mountTasksPage()

		wrapper.vm.onFilterEvent({ key: 'state', values: ['active'] })
		wrapper.vm.onFilterEvent({ key: 'state', values: [] })

		expect(wrapper.vm.namedActiveFilters).toEqual({})
	})

	it('keeps a window as a window, not as two values', async () => {
		const { wrapper } = mountTasksPage()

		wrapper.vm.onFilterEvent({ key: 'dueAt', values: { from: '2026-09-21', to: '2026-09-25' } })

		expect(wrapper.vm.namedActiveFilters.dueAt).toEqual({ from: '2026-09-21', to: '2026-09-25' })
	})
})

describe('the URL carries the filter', () => {
	it('writes the chosen case into the query', async () => {
		const { wrapper, replace } = mountTasksPage()

		wrapper.vm.onFilterEvent({ key: 'objectUuid', values: ['case-7'] })

		expect(replace).toHaveBeenCalledTimes(1)
		expect(replace.mock.calls[0][0].query.objectUuid).toBe('case-7')
	})

	it('spells a window as one parameter with both bounds', async () => {
		const { wrapper, replace } = mountTasksPage()

		wrapper.vm.onFilterEvent({ key: 'dueAt', values: { from: '2026-09-21', to: '2026-09-25' } })

		expect(replace.mock.calls[0][0].query.dueAt).toBe('2026-09-21..2026-09-25')
	})

	it('takes a cleared field back out of the query', async () => {
		const { wrapper, replace } = mountTasksPage({ state: 'active' })

		wrapper.vm.onFilterEvent({ key: 'state', values: [] })

		expect(replace.mock.calls[0][0].query.state).toBeUndefined()
	})

	/**
	 * `?action=create` is deliberately NOT the parameter under test here: the
	 * page consumes and clears that one on mount, so asserting on it would
	 * read the create dialog's own `replace` call and pass for the wrong
	 * reason.
	 */
	it('leaves a query parameter that is not one of its filters alone', async () => {
		const { wrapper, replace } = mountTasksPage({ highlight: 'row-3' })

		wrapper.vm.onFilterEvent({ key: 'state', values: ['active'] })

		expect(replace).toHaveBeenCalledTimes(1)
		expect(replace.mock.calls[0][0].query.highlight).toBe('row-3')
		expect(replace.mock.calls[0][0].query.state).toBe('active')
	})
})

describe('a shared link lands filtered', () => {
	it('seeds the filters from the query on mount', () => {
		const { wrapper } = mountTasksPage({ objectUuid: 'case-7', state: 'available,active' })

		expect(wrapper.vm.namedActiveFilters).toEqual({
			objectUuid: ['case-7'],
			state: ['available', 'active'],
		})
	})

	it('reads a window back out of its one parameter', () => {
		const { wrapper } = mountTasksPage({ dueAt: '2026-09-21..2026-09-25' })

		expect(wrapper.vm.namedActiveFilters.dueAt).toEqual({ from: '2026-09-21', to: '2026-09-25' })
	})

	it('reads an open-ended window without inventing the other bound', () => {
		const { wrapper } = mountTasksPage({ dueAt: '..2026-09-25' })

		expect(wrapper.vm.namedActiveFilters.dueAt).toEqual({ to: '2026-09-25' })
	})

	/**
	 * A hand-edited link must not be able to invent a field. Only a property
	 * the page's own schema declares facetable is read back.
	 */
	it('ignores a query parameter the schema does not declare facetable', () => {
		const { wrapper } = mountTasksPage({ notAFilter: 'anything', somethingElse: 'x' })

		expect(wrapper.vm.namedActiveFilters).toEqual({})
	})
})
