/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChartWidget — the labels of an aggregate's reference keys are read in ONE
 * list request (`_ids=a,b,c`), not one GET per key. Both the shared-store path
 * and the no-store axios path.
 *
 * @spec openspec/changes/chart-label-resolve-batched/specs/chart-label-resolve-batched/spec.md#requirement-the-labels-of-a-chart-are-read-in-one-request
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		for (const [k, v] of Object.entries(params || {})) {
			out = out.replace(`{${k}}`, v)
		}
		return `/nc${out}`
	}),
}))

// The store each test hands the chart; null means "no active pinia".
let mockStore = null
jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => {
		if (mockStore === null) {
			throw new Error('no active pinia')
		}
		return mockStore
	},
}))

/* These imports sit BELOW the jest.mock() calls on purpose: the mocks decide
   which resolution path the chart takes. */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const GROUPED_URL = '/nc/apps/openregister/api/objects/aggregations/dossiq/case/grouped'
const LIST_URL = '/nc/apps/openregister/api/objects/dossiq/statusType'
const STATUS = {
	'uuid-rec': 'Received',
	'uuid-work': 'In progress',
	'uuid-dec': 'Decision',
}

function groups(keys) {
	return { data: { groups: keys.map((key, i) => ({ key, value: 10 - i })) } }
}

function mountChart() {
	return shallowMount(CnChartWidget, {
		propsData: {
			type: 'bar-list',
			dataSource: {
				register: 'dossiq',
				schema: 'case',
				aggregate: { groupBy: 'status', labelResolve: { schema: 'statusType' } },
			},
		},
	})
}

async function settle(wrapper) {
	await flush()
	await flush()
	await wrapper.vm.$nextTick()
}

describe('CnChartWidget — labelResolve reads its labels in one request', () => {
	beforeEach(() => {
		axios.get.mockReset()
		mockStore = null
	})

	describe('without a store (axios path)', () => {
		it('reads every label with one _ids list request and no per-id GET', async () => {
			axios.get.mockImplementation((url, config) => {
				if (url === GROUPED_URL) {
					return Promise.resolve(groups(['uuid-work', 'uuid-rec', 'uuid-dec']))
				}
				if (url === LIST_URL) {
					const ids = config.params._ids.split(',')
					return Promise.resolve({ data: { results: ids.map((id) => ({ id, name: STATUS[id] })) } })
				}
				return Promise.reject(new Error(`unexpected url ${url}`))
			})
			const wrapper = mountChart()
			await settle(wrapper)

			expect(wrapper.vm.resolvedCategories).toEqual(['In progress', 'Received', 'Decision'])
			const listCalls = axios.get.mock.calls.filter(([url]) => url === LIST_URL)
			expect(listCalls).toHaveLength(1)
			expect(listCalls[0][1].params).toEqual({ _ids: 'uuid-work,uuid-rec,uuid-dec', _limit: 3 })
			expect(axios.get.mock.calls.filter(([url]) => url.startsWith(`${LIST_URL}/`))).toHaveLength(0)
		})

		it('reads an id the batch did not return on its own, and a dangling one reads "Unknown"', async () => {
			axios.get.mockImplementation((url) => {
				if (url === GROUPED_URL) {
					return Promise.resolve(groups(['uuid-work', 'uuid-rec', 'uuid-gone']))
				}
				if (url === LIST_URL) {
					// uuid-rec is missing from the batch; uuid-gone does not exist.
					return Promise.resolve({ data: { results: [{ id: 'uuid-work', name: 'In progress' }] } })
				}
				if (url === `${LIST_URL}/uuid-rec`) {
					return Promise.resolve({ data: { name: 'Received' } })
				}
				return Promise.reject(new Error('404'))
			})
			const wrapper = mountChart()
			await settle(wrapper)

			expect(wrapper.vm.resolvedCategories).toEqual(['In progress', 'Received', 'Unknown'])
			expect(axios.get.mock.calls.map(([url]) => url)).not.toContain(`${LIST_URL}/uuid-work`)
		})

		it('a server that ignores _ids labels nothing wrongly', async () => {
			axios.get.mockImplementation((url) => {
				if (url === GROUPED_URL) {
					return Promise.resolve(groups(['uuid-work', 'uuid-rec']))
				}
				if (url === LIST_URL) {
					// The unfiltered list: other status types, not the ones asked.
					return Promise.resolve({ data: { results: [{ id: 'uuid-other', name: 'Other' }, { id: 'uuid-x', name: 'X' }] } })
				}
				const id = url.split('/').pop()
				return STATUS[id] ? Promise.resolve({ data: { name: STATUS[id] } }) : Promise.reject(new Error('404'))
			})
			const wrapper = mountChart()
			await settle(wrapper)

			expect(wrapper.vm.resolvedCategories).toEqual(['In progress', 'Received'])
		})

		it('a failing batch falls back to the per-id reads', async () => {
			axios.get.mockImplementation((url) => {
				if (url === GROUPED_URL) {
					return Promise.resolve(groups(['uuid-work', 'uuid-rec']))
				}
				if (url === LIST_URL) {
					return Promise.reject(new Error('500'))
				}
				const id = url.split('/').pop()
				return STATUS[id] ? Promise.resolve({ data: { name: STATUS[id] } }) : Promise.reject(new Error('404'))
			})
			const wrapper = mountChart()
			await settle(wrapper)

			expect(wrapper.vm.resolvedCategories).toEqual(['In progress', 'Received'])
		})

		it('one key is read with its own GET, not a list request', async () => {
			axios.get.mockImplementation((url) => {
				if (url === GROUPED_URL) {
					return Promise.resolve(groups(['uuid-dec']))
				}
				if (url === `${LIST_URL}/uuid-dec`) {
					return Promise.resolve({ data: { name: 'Decision' } })
				}
				return Promise.reject(new Error(`unexpected url ${url}`))
			})
			const wrapper = mountChart()
			await settle(wrapper)

			expect(wrapper.vm.resolvedCategories).toEqual(['Decision'])
			expect(axios.get.mock.calls.map(([url]) => url)).not.toContain(LIST_URL)
		})
	})

	describe('with the shared object store', () => {
		function fakeStore(cached = {}) {
			return {
				objectTypeRegistry: {},
				objects: { 'dossiq/statusType': cached },
				registerObjectType: jest.fn(function(slug, schema, register) {
					this.objectTypeRegistry[slug] = { schema, register }
				}),
				fetchCollectionForOptions: jest.fn((type, params) => Promise.resolve(params._ids.split(',').map((id) => ({ id, name: STATUS[id] })))),
				fetchObject: jest.fn(() => Promise.resolve(null)),
			}
		}

		it('asks the store for one collection by _ids and never per object', async () => {
			mockStore = fakeStore()
			axios.get.mockImplementation((url) => (url === GROUPED_URL
				? Promise.resolve(groups(['uuid-work', 'uuid-rec', 'uuid-dec']))
				: Promise.reject(new Error(`unexpected url ${url}`))))
			const wrapper = mountChart()
			await settle(wrapper)

			expect(wrapper.vm.resolvedCategories).toEqual(['In progress', 'Received', 'Decision'])
			expect(mockStore.fetchCollectionForOptions).toHaveBeenCalledTimes(1)
			expect(mockStore.fetchCollectionForOptions).toHaveBeenCalledWith('dossiq/statusType', { _ids: 'uuid-work,uuid-rec,uuid-dec', _limit: 3 })
			expect(mockStore.fetchObject).not.toHaveBeenCalled()
		})

		it('leaves the ids the store already holds out of the batch', async () => {
			mockStore = fakeStore({ 'uuid-work': { id: 'uuid-work', name: 'In progress' } })
			axios.get.mockImplementation((url) => (url === GROUPED_URL
				? Promise.resolve(groups(['uuid-work', 'uuid-rec', 'uuid-dec']))
				: Promise.reject(new Error(`unexpected url ${url}`))))
			const wrapper = mountChart()
			await settle(wrapper)

			expect(wrapper.vm.resolvedCategories).toEqual(['In progress', 'Received', 'Decision'])
			expect(mockStore.fetchCollectionForOptions).toHaveBeenCalledWith('dossiq/statusType', { _ids: 'uuid-rec,uuid-dec', _limit: 2 })
			expect(mockStore.fetchObject).not.toHaveBeenCalled()
		})
	})
})
