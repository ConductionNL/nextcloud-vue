/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list inside a tab panel renders every row it fetched: the panel is not a
 * cell it owns, so measuring a fit there clips it (dossiq DqAanbesteding showed
 * 2 of 4 bids plus "+2 more" at limit 25). An explicit `fit: true` still fits.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i), title: 'r' + i }))

/**
 * Mount the widget in a grid cell, optionally inside a tab panel in it. jsdom
 * lays nothing out, so a fit that engages floors to one row.
 *
 * @param {boolean} inTab Whether a `role="tabpanel"` wraps the list.
 * @param {object} [content] Extra content.
 * @return {object} The wrapper.
 */
function mountList(inTab, content = {}) {
	const cell = document.createElement('div')
	cell.className = 'grid-stack-item-content'
	let parent = cell
	if (inTab) {
		const panel = document.createElement('div')
		panel.className = 'cn-tab'
		panel.setAttribute('role', 'tabpanel')
		cell.appendChild(panel)
		parent = panel
	}
	const host = document.createElement('div')
	parent.appendChild(host)
	document.body.appendChild(cell)
	return shallowMount(CnObjectListWidget, {
		attachTo: host,
		propsData: { content: { register: 'r', schema: 's', limit: 25, ...content } },
		stubs: {
			CnDataTable: { template: '<table><tbody><tr v-for="r in rows" :key="r.id"><td>{{ r.title }}</td></tr></tbody></table>', props: ['rows'] },
			CnFormDialog: true,
			CnPagination: true,
			CnWidgetEmptyState: true,
		},
		mocks: { t: (_a, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectListWidget in a tab panel', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		document.body.innerHTML = ''
		mockGet.mockResolvedValue({ data: { results: rows(4), total: 4 } })
	})

	it('renders every fetched row inside a tab panel', async () => {
		const w = mountList(true)
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBeNull()
		expect(w.vm.visibleRows).toHaveLength(4)
		expect(w.vm.hiddenCount).toBe(0)
		w.unmount()
	})

	it('still fits a list that owns its cell', async () => {
		const w = mountList(false)
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBe(1)
		w.unmount()
	})

	it('fits inside a tab panel when the content asks with fit: true', async () => {
		const w = mountList(true, { fit: true })
		await flushPromises()
		w.vm.measureFit()
		expect(w.vm.fitRows).toBe(1)
		w.unmount()
	})
})
