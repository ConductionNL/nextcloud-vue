/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Wave-3 (#91) additions on CnWidgetObjectTable:
 * - `source.extend` → OR `_extend` fetch param (procest calc-columns
 *   contract: virtual daysOverdue/daysUntilDeadline fields ride the fetch)
 * - `@objectId` / `@object.<field>` source-filter tokens resolving from
 *   the v2 CnPageRenderer `cnDetailObjectContext` holder (the ZGW
 *   sidebar-tab contract) — no CnDetailPage ancestor required.
 */

import { shallowMount } from '@vue/test-utils'

import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'

describe('CnWidgetObjectTable — Wave 3 (#91)', () => {
	it('forwards source.extend as the _extend fetch param (repeated-array shape)', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'procest',
					schema: 'case',
					extend: ['calculations'],
					order: { deadline: 'asc' },
				},
			},
		})
		expect(wrapper.vm.resolvedFetchParams).toEqual({
			'_order[deadline]': 'asc',
			_extend: ['calculations'],
		})
	})

	it('ignores an empty / non-string extend without breaking the params', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: { register: 'r', schema: 's', extend: [] },
			},
		})
		expect(wrapper.vm.resolvedFetchParams).toEqual({})
	})

	it('resolves @objectId / @object.<field> filter tokens from the v2 cnDetailObjectContext holder', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'zgw',
					schema: 'status',
					filter: { zaak: '@objectId', zaakUrl: '@object.url' },
				},
			},
			provide: {
				cnDetailObjectContext: {
					value: {
						objectData: { url: 'https://zgw/zaken/42' },
						objectId: '42',
						register: 'zgw',
						schema: 'zaak',
					},
				},
			},
		})
		expect(wrapper.vm.resolvedFilter).toEqual({
			zaak: '42',
			zaakUrl: 'https://zgw/zaken/42',
		})
		expect(wrapper.vm.waitingForContext).toBe(false)
	})
})

describe('CnWidgetObjectTable — declarative rowClass (#91)', () => {
	function mountWithRowClass(rowClass) {
		return shallowMount(CnWidgetObjectTable, {
			propsData: { rows: [], columns: ['title'], rowClass },
		})
	}

	it('compiles a rules[] array into a (row) => class function forwarded to CnDataTable', () => {
		const wrapper = mountWithRowClass([
			{ when: { field: 'status', op: 'eq', value: 'overdue' }, class: 'row--overdue' },
			{ when: { field: 'daysLeft', op: 'lt', value: 3 }, class: 'row--at-risk' },
		])
		const fn = wrapper.vm.compiledRowClass
		expect(typeof fn).toBe('function')
		// The compiled function is the one handed to CnDataTable.
		expect(wrapper.vm.innerProps.rowClass).toBe(fn)

		expect(fn({ status: 'overdue', daysLeft: 10 })).toBe('row--overdue')
		expect(fn({ status: 'open', daysLeft: 1 })).toBe('row--at-risk')
		// Both predicates hold → both classes join with a space (rule order).
		expect(fn({ status: 'overdue', daysLeft: 1 })).toBe('row--overdue row--at-risk')
		// Neither holds → empty string.
		expect(fn({ status: 'open', daysLeft: 9 })).toBe('')
	})

	it('defaults op to eq and reads a dot-path field', () => {
		const wrapper = mountWithRowClass([
			{ when: { field: 'meta.flag', value: 'red' }, class: 'row--red' },
		])
		const fn = wrapper.vm.compiledRowClass
		expect(fn({ meta: { flag: 'red' } })).toBe('row--red')
		expect(fn({ meta: { flag: 'green' } })).toBe('')
	})

	it('passes a host-supplied rowClass FUNCTION straight through (back-compat)', () => {
		const fn = (row) => (row.hot ? 'row--hot' : '')
		const wrapper = mountWithRowClass(fn)
		expect(wrapper.vm.compiledRowClass).toBe(fn)
		expect(wrapper.vm.innerProps.rowClass).toBe(fn)
	})

	it('forwards no rowClass when unset or an empty array', () => {
		expect(mountWithRowClass(null).vm.compiledRowClass).toBeNull()
		expect(mountWithRowClass([]).vm.compiledRowClass).toBeNull()
		expect('rowClass' in mountWithRowClass(null).vm.innerProps).toBe(false)
	})
})
