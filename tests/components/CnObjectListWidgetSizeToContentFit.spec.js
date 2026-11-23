/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list in a dashboard cell that sizes to its content renders every row it
 * fetched: the cell takes the list's height, so fitting the list to the cell
 * clips it to the cell's first, authored height (pipelinq PqOperationeel
 * Klachten showed 1 of 6 complaints plus "+12 more"). A row maximum
 * (`gs-size-to-content="4"`) and an explicit `fit: true` still fit.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i), title: 'r' + i }))

/**
 * Mount the widget in a grid item. jsdom lays nothing out, so a fit that
 * engages floors to one row.
 *
 * @param {string|null} sizeToContent The item's `gs-size-to-content`, or null for none.
 * @param {object} [content] Extra content.
 * @return {object} The wrapper.
 */
function mountList(sizeToContent, content = {}) {
	const item = document.createElement('div')
	item.className = 'grid-stack-item'
	if (sizeToContent !== null) {
		item.setAttribute('gs-size-to-content', sizeToContent)
	}
	const cell = document.createElement('div')
	cell.className = 'grid-stack-item-content'
	item.appendChild(cell)
	const host = document.createElement('div')
	cell.appendChild(host)
	document.body.appendChild(item)
	return shallowMount(CnObjectListWidget, {
		attachTo: host,
		propsData: { content: { register: 'r', schema: 's', limit: 6, ...content } },
		stubs: {
			CnDataTable: { template: '<table><tbody><tr v-for="r in rows" :key="r.id"><td>{{ r.title }}</td></tr></tbody></table>', props: ['rows'] },
			CnFormDialog: true,
			CnPagination: true,
			CnWidgetEmptyState: true,
		},
		mocks: { t: (_a, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectListWidget in a size-to-content cell', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		document.body.innerHTML = ''
		mockGet.mockResolvedValue({ data: { results: rows(6), total: 13 } })
	})

	it('renders every fetched row when the cell sizes to its content', async () => {
		const w = mountList('true')
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBeNull()
		expect(w.vm.visibleRows).toHaveLength(6)
		w.unmount()
	})

	it('still fits a cell with a row maximum', async () => {
		const w = mountList('4')
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBe(1)
		w.unmount()
	})

	it('still fits a cell with an authored height', async () => {
		const w = mountList(null)
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBe(1)
		w.unmount()
	})

	it('fits a size-to-content cell when the content asks with fit: true', async () => {
		const w = mountList('true', { fit: true })
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBe(1)
		w.unmount()
	})
})
