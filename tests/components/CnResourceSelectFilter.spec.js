/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/transition-input-reference-and-subfields/tasks.md#task-1
 */
import { shallowMount } from '@vue/test-utils'

const mockStore = {
	registerObjectType: jest.fn(),
	fetchCollectionForOptions: jest.fn(() => Promise.resolve([])),
	fetchObject: jest.fn(() => Promise.resolve(null)),
	saveObject: jest.fn(),
	collections: {},
}
jest.mock('../../src/store/index.js', () => ({ __esModule: true, useObjectStore: () => mockStore }))

import CnResourceSelect from '../../src/components/CnResourceSelect/CnResourceSelect.vue'

const mount = (props = {}) => shallowMount(CnResourceSelect, { props: { register: 'learniq', schema: 'profile', ...props } })

beforeEach(() => mockStore.fetchCollectionForOptions.mockClear())

describe('CnResourceSelect filter and exclude', () => {
	it('declares both with empty defaults', () => {
		expect(CnResourceSelect.props.filter.default()).toEqual({})
		expect(CnResourceSelect.props.exclude.default()).toEqual([])
	})

	it('passes filter to the list query', async () => {
		const w = mount({ filter: { lifecycle: 'active' }, minChars: 2 })
		await w.vm.onSearch('Jan')
		expect(mockStore.fetchCollectionForOptions).toHaveBeenCalledWith('learniq-profile', expect.objectContaining({ lifecycle: 'active', _search: 'Jan' }))
	})

	it('merges filter with filters, filter winning on a clash', () => {
		const w = mount({ filters: { a: 1, lifecycle: 'x' }, filter: { lifecycle: 'active' } })
		expect(w.vm.activeFilters).toEqual({ a: 1, lifecycle: 'active' })
	})

	it('leaves excluded ids out of the options', async () => {
		const w = mount()
		await w.setData({ options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] })
		await w.setProps({ exclude: ['a'] })
		expect(w.vm.displayOptions.map((o) => o.value)).toEqual(['b'])
	})
})
