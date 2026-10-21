/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The filters have to leave the browser, and the route query does not take
 * them: CnIndexPage drops every `_`-prefixed route key before it builds its
 * request. The second channel is `sidebarState.onFilterChange`, which these
 * assertions watch.
 *
 * @spec openspec/changes/dq-abstract-forms/specs/related-field-filters/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRelatedFieldFilters from '../../src/components/CnRelatedFieldFilters/CnRelatedFieldFilters.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const COST = { '@self': { uuid: 'pd-1' }, name: 'bouwkosten', propertyType: 'number', filterable: true }
const DISTRICT = { '@self': { uuid: 'pd-4' }, name: 'stadsdeel', propertyType: 'string', enumValues: ['Noord', 'Zuid'], filterable: true }

const CONFIG = {
	definitions: { register: 'dossiq', schema: 'propertyDefinition', filter: { caseType: '$route.query.caseType' } },
	related: { schema: 'caseProperty', backref: 'case', definitionKey: 'propertyDefinition', valueKey: 'value' },
}

let onFilterChange
let replace

/**
 * Mount the bar over a list that records what it is asked to filter on.
 *
 * @param {object} [query] The route query.
 * @param {object} [extra] More mount options.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The wrapper.
 */
async function mountBar(query = { caseType: 'ct-1' }, extra = {}) {
	const wrapper = mount(CnRelatedFieldFilters, {
		props: { ...CONFIG, storeKey: 'dossiq-case' },
		global: {
			provide: { sidebarState: { onFilterChange } },
			mocks: { $route: { query }, $router: { replace } },
			...extra,
		},
	})
	await flushPromises()
	return wrapper
}

/** @return {Array<object>} The calls the list received. */
const calls = () => onFilterChange.mock.calls.map(([call]) => call)

beforeEach(() => {
	onFilterChange = jest.fn()
	replace = jest.fn()
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: [COST, DISTRICT] } })
})

describe('CnRelatedFieldFilters', () => {
	it('reads the definitions of the scope, with a bare filter key', async () => {
		await mountBar()

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/dossiq/propertyDefinition', { params: { caseType: 'ct-1', _limit: 200 } })
	})

	it('renders nothing and asks nothing until the scope is set', async () => {
		const wrapper = await mountBar({})

		expect(wrapper.find('[data-testid="related-field-filters"]').exists()).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('draws a number as a from/to range and a list as a select, by test id', async () => {
		const wrapper = await mountBar()
		const filters = wrapper.findComponent({ name: 'CnFilterBar' }).props('filters')

		expect(filters.map((f) => [f.key, f.type, f.testid])).toEqual([
			['pd-1', 'range', 'field-filter-pd-1'],
			['pd-4', 'select', 'field-filter-pd-4'],
		])
	})

	it('hands one filled field to the list, not only to the URL', async () => {
		const wrapper = await mountBar()
		wrapper.findComponent({ name: 'CnFilterBar' }).vm.$emit('filter-change', { key: 'pd-1', value: { gte: '100000', lte: '' } })

		expect(calls()).toContainEqual({ key: '_related[caseProperty][case][propertyDefinition]', values: ['pd-1'] })
		expect(calls()).toContainEqual({ key: '_related[caseProperty][case][value][gte]', values: ['100000'] })
		expect(replace).toHaveBeenCalledWith({ query: expect.objectContaining({ caseType: 'ct-1', '_related[caseProperty][case][value][gte]': '100000' }) })
	})

	it('numbers two filled fields after the backref', async () => {
		const wrapper = await mountBar()
		const bar = wrapper.findComponent({ name: 'CnFilterBar' })
		bar.vm.$emit('filter-change', { key: 'pd-1', value: { gte: '100000' } })
		bar.vm.$emit('filter-change', { key: 'pd-4', value: 'Noord' })

		const keys = calls().map((call) => call.key)
		expect(keys).toContain('_related[caseProperty][case][0][propertyDefinition]')
		expect(keys).toContain('_related[caseProperty][case][1][propertyDefinition]')
	})

	it('takes a filter off the list when the field is emptied', async () => {
		const wrapper = await mountBar()
		const bar = wrapper.findComponent({ name: 'CnFilterBar' })
		bar.vm.$emit('filter-change', { key: 'pd-1', value: { gte: '100000' } })
		onFilterChange.mockClear()
		bar.vm.$emit('filter-change', { key: 'pd-1', value: { gte: '' } })

		expect(calls()).toContainEqual({ key: '_related[caseProperty][case][propertyDefinition]', values: [] })
	})

	it('replays a shared link, which the page would otherwise fetch unfiltered', async () => {
		await mountBar({
			caseType: 'ct-1',
			'_related[caseProperty][case][propertyDefinition]': 'pd-1',
			'_related[caseProperty][case][value][gte]': '100000',
		})

		expect(calls()).toContainEqual({ key: '_related[caseProperty][case][value][gte]', values: ['100000'] })
	})

	it('says nothing to a page that has not wired a list, and still records the route', async () => {
		const wrapper = mount(CnRelatedFieldFilters, {
			props: CONFIG,
			global: { provide: { sidebarState: null }, mocks: { $route: { query: { caseType: 'ct-1' } }, $router: { replace } } },
		})
		await flushPromises()

		expect(() => wrapper.findComponent({ name: 'CnFilterBar' }).vm.$emit('filter-change', { key: 'pd-1', value: { gte: '1' } })).not.toThrow()
		expect(replace).toHaveBeenCalled()
	})

	it('offers no filters when the definitions cannot be read, and applies none', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const wrapper = await mountBar()

		expect(wrapper.find('[data-testid="related-field-filters"]').exists()).toBe(false)
		expect(onFilterChange).not.toHaveBeenCalled()
	})
})

describe('CnRelatedFieldFilters and a refused block', () => {
	it('names the field the list refused, under the bar', async () => {
		const { useObjectStore } = require('../../src/store/index.js')
		const wrapper = await mountBar()
		useObjectStore().errors = { 'dossiq-case': { response: { data: { error: 'Malformed _related block for pd-1' } } } }
		await flushPromises()

		const notice = wrapper.get('[data-testid="related-field-filters-refusal"]').text()
		expect(notice).toContain('The filter on bouwkosten was refused, so this list is not an answer.')
		expect(notice).toContain('Malformed _related block for pd-1')
	})

	it('does not report a refused search term as a refused field filter', async () => {
		const { useObjectStore } = require('../../src/store/index.js')
		const wrapper = await mountBar()
		useObjectStore().errors = { 'dossiq-case': { response: { data: { error: 'Unclosed quote in _search' } } } }
		await flushPromises()

		expect(wrapper.find('[data-testid="related-field-filters-refusal"]').exists()).toBe(false)
	})
})
