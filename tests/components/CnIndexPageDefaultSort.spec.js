/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnIndexPage's declarative `defaultSort` — a default multi-key
 * client-side sort applied to the loaded rows whenever no explicit column
 * sort is active. A live `sortKey` (user / prop) suppresses it.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const ROWS = [
	{ id: '1', type: 'b', name: 'Zeta' },
	{ id: '2', type: 'a', name: 'Yankee' },
	{ id: '3', type: 'a', name: 'Alpha' },
	{ id: '4', type: 'b', name: 'Beta' },
]

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Categories',
			schema: { title: 'Category', properties: {} },
			objects: ROWS,
			...extra,
		},
		mocks: { $router: { push: jest.fn() } },
		stubs: {
			CnDataTable: true,
			CnCardGrid: true,
			CnPagination: true,
			CnActionsBar: true,
			CnContextMenu: true,
			CnRowActions: true,
			CnIndexSidebar: true,
		},
	})
}

describe('CnIndexPage — defaultSort', () => {
	it('passes rows through untouched when no defaultSort is set', () => {
		const wrapper = mountPage()
		expect(wrapper.vm.displayObjects.map((r) => r.id)).toEqual(['1', '2', '3', '4'])
	})

	it('applies a multi-key sort (group by type, then name)', () => {
		const wrapper = mountPage({
			defaultSort: [
				{ field: 'type', order: 'asc' },
				{ field: 'name', order: 'asc' },
			],
		})
		expect(wrapper.vm.displayObjects.map((r) => `${r.type}:${r.name}`)).toEqual([
			'a:Alpha', 'a:Yankee', 'b:Beta', 'b:Zeta',
		])
	})

	it('suppresses defaultSort once an explicit column sort is active', () => {
		const wrapper = mountPage({
			defaultSort: [{ field: 'name', order: 'asc' }],
			sortKey: 'type',
			sortOrder: 'desc',
		})
		// The user-selected sort wins → rows fall through to server/prop order.
		expect(wrapper.vm.displayObjects.map((r) => r.id)).toEqual(['1', '2', '3', '4'])
	})
})
