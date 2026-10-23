/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 *
 * A named source that sorts on the server (the task inbox: deadline, priority,
 * created) gets a column header's order as a request parameter, and the list
 * is fetched again from page 1. DqTaken: "Deadline ^" sorts the inbox by deadline.
 *
 * @spec openspec/changes/tasks-source-sorts-on-server/specs/index-sources/spec.md#requirement-a-named-source-can-sort-on-the-server
 */

var mockGet = jest.fn(() => Promise.resolve({ data: { results: [], total: 0 } }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
const { useNamedSource } = require('../../src/components/CnIndexPage/useNamedSource.js')
const { indexSources } = require('../../src/composables/indexSources.js')

/** @return {object} The params of the most recent GET. */
function lastParams() {
	return mockGet.mock.calls[mockGet.mock.calls.length - 1][1].params
}

function mountHost(sort) {
	return mount({
		template: '<div />',
		setup() {
			return { named: useNamedSource({ entitySource: 'tasks', sourceConfig: {} }, { activeQuickFilterIndex: ref(null), sort }) }
		},
	})
}

beforeEach(() => mockGet.mockClear())

describe('the tasks source sorts on the server', () => {
	it('maps the sortable columns onto the inbox sort argument', () => {
		const source = indexSources.tasks()
		expect(source.sortParam('dueAt', 'asc')).toEqual({ sort: 'dueAt' })
		expect(source.sortParam('dueLabel', 'desc')).toEqual({ sort: '-dueAt' })
		expect(source.sortParam('priorityLabel', 'asc')).toEqual({ sort: 'priority' })
		expect(source.sortParam('created', 'desc')).toEqual({ sort: '-created' })
		expect(source.sortParam('title', 'asc')).toBeNull()
		const sortable = source.columns.filter((column) => column.sortable === true).map((column) => column.key)
		expect(sortable).toEqual(['priorityLabel', 'dueLabel'])
	})

	it('asks for the chosen order and reloads when it changes', async () => {
		const sort = ref({ key: 'dueAt', order: 'asc' })
		mountHost(sort)
		await flushPromises()
		expect(lastParams().sort).toBe('dueAt')
		sort.value = { key: 'priorityLabel', order: 'desc' }
		await nextTick()
		await flushPromises()
		expect(lastParams().sort).toBe('-priority')
	})

	it('keeps the inbox default without a chosen order', async () => {
		mountHost(ref({ key: '', order: 'asc' }))
		await flushPromises()
		expect(lastParams().sort).toBe('-dueAt')
	})
})
