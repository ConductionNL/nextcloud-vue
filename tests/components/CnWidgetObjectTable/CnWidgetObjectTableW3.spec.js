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
