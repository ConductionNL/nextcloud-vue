/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's fit-to-cell budget, and the opt-out from it.
 *
 * `measureFit` budgets visible rows against the host grid cell, measured from
 * where the TABLE starts (ADR-062: the cell is the budget). That is right for a
 * list that owns its cell, and wrong for a list that is one of several stacked
 * inside it. dossiq's case page stacks object lists as sections of one tab: a
 * list that is the third section starts near the bottom of a fixed-height cell,
 * the budget floors to one row, and the rest are clipped. Measured on a live
 * page: an Objects table starting 584px down a 696px cell showed one of two
 * objects the server had returned, and no footer said so.
 *
 * `content.fit: false` is the opt-out: the list renders every row it fetched and
 * lets its container scroll. These tests mount the widget INSIDE a grid cell,
 * because outside one `measureFit` already renders everything and the clip
 * could never be observed.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i), title: 'r' + i }))

/**
 * Mount the widget as the child of a `.grid-stack-item-content` cell.
 *
 * jsdom lays nothing out, so every rect is zero: `cellRect.bottom - tableRect.top`
 * is 0, the budget goes negative, and `Math.max(fit, 1)` floors it to ONE row.
 * That is exactly the state a list at the bottom of a stacked tab reaches on a
 * real page, which is what makes it a faithful reproduction rather than a mock.
 *
 * @param {object} content The widget content.
 * @return {object} The mounted wrapper.
 */
function mountInCell(content = {}) {
	const cell = document.createElement('div')
	cell.className = 'grid-stack-item-content'
	const host = document.createElement('div')
	cell.appendChild(host)
	document.body.appendChild(cell)
	return shallowMount(CnObjectListWidget, {
		attachTo: host,
		propsData: { content: { register: 'r', schema: 's', limit: 25, ...content } },
		// The table must really render: `measureFit` returns early without a
		// `<table>` to measure, and a stub would make every test pass vacuously.
		stubs: {
			CnDataTable: { template: '<table><tbody><tr v-for="r in rows" :key="r.id"><td>{{ r.title }}</td></tr></tbody></table>', props: ['rows'] },
			CnFormDialog: true,
			CnPagination: true,
			CnWidgetEmptyState: true,
		},
		mocks: { t: (_a, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectListWidget — fit to the host cell', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		document.body.innerHTML = ''
		mockGet.mockResolvedValue({ data: { results: rows(2), total: 2 } })
	})

	it('clips to what the cell has room for, by default', async () => {
		// The control. Without it the opt-out test below could pass because
		// fitting never engaged at all, which is the "lands and changes nothing"
		// shape of a test that cannot fail.
		const w = mountInCell()
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBe(1)
		expect(w.vm.visibleRows).toHaveLength(1)
		w.unmount()
	})

	it('renders every fetched row when the content opts out with fit: false', async () => {
		const w = mountInCell({ fit: false })
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBeNull()
		expect(w.vm.visibleRows).toHaveLength(2)
		// Nothing is hidden, so nothing may claim to be.
		expect(w.vm.hiddenCount).toBe(0)
		w.unmount()
	})

	it('still pages a long collection when fitting is off', async () => {
		// `fit: false` must not trade clipping for an unbounded list. The fetch
		// stays capped at `limit` and the pager takes over, which is what keeps
		// a case with 137 objects from rendering 137 rows into one tab.
		mockGet.mockResolvedValue({ data: { results: rows(5), total: 137 } })
		const w = mountInCell({ fit: false, limit: 5 })
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.visibleRows).toHaveLength(5)
		expect(w.vm.showPager).toBe(true)
		w.unmount()
	})

	it('treats only an explicit false as the opt-out', async () => {
		// `fit` absent, `true`, or any other value keeps the ADR-062 budget, so
		// existing dashboards that never set the key change nothing.
		for (const fit of [undefined, true, 'no', 0]) {
			const w = mountInCell(fit === undefined ? {} : { fit })
			await flushPromises()
			w.vm.measureFit()
			expect(w.vm.fitRows).toBe(1)
			w.unmount()
		}
	})
})
