/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * SEARCH FIELDS ON A NAMED-SOURCE INDEX.
 *
 * The failure this suite exists to catch is not a crash. A sidebar filter on
 * a named source used to render, take a choice, highlight it, and change
 * nothing: `activeFilters` was a prop only a consumer component could fill,
 * and a manifest page has no consumer. The list stayed exactly as it was,
 * which is indistinguishable from a filter that matched every row.
 *
 * So every test here pins the REQUEST. A choice that does not reach the wire
 * is the bug, whatever the component's state says.
 */

var mockGet = jest.fn(() => Promise.resolve({ data: { results: [], total: 0 } }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
	},
}))

import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
const { useNamedSource } = require('../../src/components/CnIndexPage/useNamedSource.js')
const { indexSources } = require('../../src/composables/indexSources.js')
const { filtersFromSchema } = require('../../src/utils/schema.js')
const { searchFieldParams } = require('../../src/utils/searchFieldParams.js')

/** @return {object} The params of the most recent GET. */
function lastParams() {
	const call = mockGet.mock.calls[mockGet.mock.calls.length - 1]
	return call[1].params
}

/**
 * Mount a bare host running the composable, the way CnIndexPage does.
 *
 * @param {object} props The CnIndexPage-shaped props.
 * @param {import('vue').Ref<number|null>} activeIndex The shared tab index ref.
 * @param {import('vue').Ref<object>} activeFilters The sidebar's chosen values.
 *
 * @return {object} The mounted wrapper.
 */
function mountHost(props, activeIndex, activeFilters) {
	return mount({
		template: '<div />',
		setup() {
			const named = useNamedSource(props, { activeQuickFilterIndex: activeIndex, activeFilters })
			return { named }
		},
	})
}

beforeEach(() => {
	mockGet.mockClear()
})

describe('the tasks source declares which fields the inbox answers', () => {
	it('maps each declared field onto a real inbox argument', () => {
		const source = indexSources.tasks()

		// `kind` joined the source in #1201 and this assertion was not moved
		// with it, so the suite has been red since. Inherited, one line.
		expect(Object.keys(source.searchFields).sort()).toEqual(['dueAt', 'kind', 'objectUuid', 'priority', 'state'])
		expect(source.searchFields.objectUuid).toEqual({ param: 'objectUuid', single: true })
		expect(source.searchFields.state).toEqual({ param: 'state', join: ',' })
		expect(source.searchFields.priority).toEqual({ param: 'priority', single: true })
		expect(source.searchFields.kind).toEqual({ param: 'kind', single: true })
		expect(source.searchFields.dueAt).toEqual({ range: ['dueAfter', 'dueBefore'] })
	})

	/**
	 * The one field a task search is expected to have and this inbox cannot
	 * answer. `TaskInboxCriteria` has no assignee predicate: `scope` resolves
	 * to the CALLING user, and the store's allowlist drops the key a second
	 * time so no config can widen whose inbox it is. Declaring it here would
	 * put a picker on screen that quietly answers about everybody.
	 */
	it('does not declare assignee, which the inbox has no predicate for', () => {
		const source = indexSources.tasks()

		expect(source.searchFields.assignee).toBeUndefined()
	})
})

describe('mapping the sidebar choices onto loader arguments', () => {
	it('sends one value for a single-valued argument, the first chosen', () => {
		const source = indexSources.tasks()

		expect(searchFieldParams(source.searchFields, { priority: ['high', 'urgent'] }))
			.toEqual({ priority: 'high' })
	})

	it('joins a multi-valued argument the way the endpoint reads it', () => {
		const source = indexSources.tasks()

		expect(searchFieldParams(source.searchFields, { state: ['available', 'active'] }))
			.toEqual({ state: 'available,active' })
	})

	it('splits one window field into the two arguments it is on the wire', () => {
		const source = indexSources.tasks()

		expect(searchFieldParams(source.searchFields, { dueAt: { from: '2026-09-21', to: '2026-09-25' } }))
			.toEqual({ dueAfter: '2026-09-21', dueBefore: '2026-09-25' })
	})

	it('keeps an open-ended window open rather than inventing the other bound', () => {
		const source = indexSources.tasks()

		expect(searchFieldParams(source.searchFields, { dueAt: { to: '2026-09-25' } }))
			.toEqual({ dueBefore: '2026-09-25' })
	})

	it('contributes nothing for a field nobody chose', () => {
		const source = indexSources.tasks()

		expect(searchFieldParams(source.searchFields, { priority: [], state: '', dueAt: null }))
			.toEqual({})
	})

	/**
	 * Every scenario in the spec's third case. A declared sidebar field with
	 * no mapping is a control that cannot narrow anything, and it looks
	 * exactly like one that matched every row, so it is said out loud.
	 */
	it('refuses an undeclared field loudly instead of sending it', () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
		const source = indexSources.tasks()

		const params = searchFieldParams(source.searchFields, { assignee: ['alice'] }, 'tasks')

		expect(params).toEqual({})
		expect(consoleError).toHaveBeenCalledTimes(1)
		expect(consoleError.mock.calls[0][0]).toContain('assignee')
		consoleError.mockRestore()
	})

	it('stays quiet about an undeclared field nobody chose a value in', () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
		const source = indexSources.tasks()

		searchFieldParams(source.searchFields, { assignee: [] }, 'tasks')

		expect(consoleError).not.toHaveBeenCalled()
		consoleError.mockRestore()
	})
})

describe('a sidebar choice reaches the server', () => {
	it('narrows the inbox request to one case', async () => {
		const activeIndex = ref(null)
		const filters = ref({})
		mountHost({ entitySource: 'tasks', objects: [], quickFilters: null, sourceConfig: null }, activeIndex, filters)
		await nextTick()
		expect(mockGet).toHaveBeenCalledTimes(1)

		filters.value = { objectUuid: ['case-7'] }
		await flushPromises()

		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(lastParams().objectUuid).toBe('case-7')
	})

	/**
	 * D-3: a lens sets the question, a field narrows the answer. Both reach
	 * the endpoint in ONE request; nothing is reduced over a fetched page.
	 */
	it('composes the lens and the field in a single request', async () => {
		const activeIndex = ref(1)
		const filters = ref({ priority: ['urgent'] })
		mountHost({ entitySource: 'tasks', objects: [], quickFilters: null, sourceConfig: null }, activeIndex, filters)
		await flushPromises()

		const params = lastParams()
		expect(params.scope).toBe('pooled')
		expect(params.priority).toBe('urgent')
	})

	it('lets the field win the rare key it shares with the lens', async () => {
		const activeIndex = ref(0)
		const filters = ref({ state: ['completed'] })
		mountHost({
			entitySource: 'tasks',
			objects: [],
			quickFilters: [{ label: 'Open', filter: { scope: 'all', state: 'active' }, default: true }],
			sourceConfig: null,
		}, activeIndex, filters)
		await flushPromises()

		expect(lastParams().state).toBe('completed')
	})

	it('reloads rather than re-slicing when a choice changes', async () => {
		const activeIndex = ref(null)
		const filters = ref({})
		mountHost({ entitySource: 'tasks', objects: [], quickFilters: null, sourceConfig: null }, activeIndex, filters)
		await nextTick()

		filters.value = { ...filters.value, priority: ['high'] }
		await flushPromises()
		filters.value = { ...filters.value, state: ['active'] }
		await flushPromises()

		expect(mockGet).toHaveBeenCalledTimes(3)
		expect(lastParams().priority).toBe('high')
		expect(lastParams().state).toBe('active')
	})

	it('sends a window as the two arguments the inbox takes', async () => {
		const activeIndex = ref(null)
		const filters = ref({})
		mountHost({ entitySource: 'tasks', objects: [], quickFilters: null, sourceConfig: null }, activeIndex, filters)
		await nextTick()

		filters.value = { dueAt: { from: '2026-09-21T00:00:00Z', to: '2026-09-25T23:59:59Z' } }
		await flushPromises()

		expect(lastParams().dueAfter).toBe('2026-09-21T00:00:00Z')
		expect(lastParams().dueBefore).toBe('2026-09-25T23:59:59Z')
		expect(lastParams().dueAt).toBeUndefined()
	})
})

describe('a property says how it wants to be asked for', () => {
	const schema = {
		properties: {
			objectUuid: {
				type: 'string',
				title: 'Case',
				facetable: true,
				order: 1,
				inputControl: 'reference',
				optionsSource: { register: 'dossiq', schema: 'case', labelField: 'title' },
			},
			state: {
				type: 'string',
				title: 'State',
				facetable: true,
				order: 2,
				inputControl: 'multiselect',
				enum: ['available', 'active'],
			},
			priority: {
				type: 'string',
				title: 'Priority',
				facetable: true,
				order: 3,
				inputControl: 'select',
				enum: ['low', 'high'],
			},
			dueAt: {
				type: 'string',
				title: 'Due between',
				facetable: true,
				order: 4,
				inputControl: 'date-range',
			},
		},
	}

	it('gives each control its own widget, in declared order', () => {
		const filters = filtersFromSchema(schema)

		expect(filters.map((f) => f.key)).toEqual(['objectUuid', 'state', 'priority', 'dueAt'])
		expect(filters.map((f) => f.type)).toEqual(['reference', 'select', 'select', 'date-range'])
	})

	it('marks the single-valued controls single', () => {
		const filters = filtersFromSchema(schema)
		const byKey = Object.fromEntries(filters.map((f) => [f.key, f]))

		expect(byKey.objectUuid.multiple).toBe(false)
		expect(byKey.priority.multiple).toBe(false)
		expect(byKey.state.multiple).toBe(true)
	})

	it('carries the reference picker its source', () => {
		const filters = filtersFromSchema(schema)
		const reference = filters.find((f) => f.key === 'objectUuid')

		expect(reference.optionsSource).toEqual({ register: 'dossiq', schema: 'case', labelField: 'title' })
	})

	/**
	 * A schema written before `inputControl` existed keeps the widget it had.
	 * Every fleet schema is one of those.
	 */
	it('leaves a property that declares no control exactly as it was', () => {
		const filters = filtersFromSchema({
			properties: {
				status: { type: 'string', title: 'Status', facetable: true, enum: ['open'] },
				archived: { type: 'boolean', title: 'Archived', facetable: true },
			},
		})
		const byKey = Object.fromEntries(filters.map((f) => [f.key, f]))

		expect(byKey.status.type).toBe('select')
		expect(byKey.status.multiple).toBe(true)
		expect(byKey.archived.type).toBe('checkbox')
	})

	it('falls back to the type guess for a control it has not learned', () => {
		const filters = filtersFromSchema({
			properties: {
				status: { type: 'string', title: 'Status', facetable: true, enum: ['open'], inputControl: 'hologram' },
			},
		})

		expect(filters[0].type).toBe('select')
	})
})
