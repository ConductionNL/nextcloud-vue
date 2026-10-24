/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisaties: a count column draws its counts as pills and an empty count
 * as muted text when its aggregate says `zeroAs: "text"`.
 *
 * @spec openspec/changes/aggregate-zero-as-text/specs/index-page/spec.md#requirement-a-count-column-can-show-its-zero-label-as-text
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [{ id: 'org1', name: 'Buurtvereniging Oost' }, { id: 'org2', name: 'Sportclub Zuiddrecht' }]

function mountTable(aggregate) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns: ['name', { key: 'openCases', label: 'Lopende zaken', widget: 'badge', aggregate }] },
		stubs: { CnCellRenderer: { props: ['value', 'widget'], template: '<span class="cell" :data-widget="widget">{{ value }}</span>' } },
	})
}

async function flush(wrapper) {
	await new Promise((resolve) => setTimeout(resolve))
	await wrapper.vm.$nextTick()
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation(async (url, { params }) => ({ data: { total: params.requester === 'org1' ? 1 : 0, results: [] } }))
})

describe('CnDataTable aggregate zeroAs text', () => {
	const aggregate = { register: 'dossiq', schema: 'case', op: 'count', where: { requester: '@self.id' }, zeroLabel: 'None' }

	it('draws the zero label as muted text and a count through the widget', async () => {
		const w = mountTable({ ...aggregate, zeroAs: 'text' })
		await flush(w)
		const zero = w.findAll('[data-testid="cn-cell-zero"]')
		expect(zero).toHaveLength(1)
		expect(zero.at(0).text()).toBe('None')
		expect(zero.at(0).classes()).toContain('cn-table-cell__zero')
		const widgetCells = w.findAll('.cell[data-widget="badge"]').map((cell) => cell.text())
		expect(widgetCells).toEqual(['1'])
	})

	it('keeps the zero label in the widget without it', async () => {
		const w = mountTable(aggregate)
		await flush(w)
		expect(w.findAll('[data-testid="cn-cell-zero"]')).toHaveLength(0)
		expect(w.findAll('.cell[data-widget="badge"]').map((cell) => cell.text())).toEqual(['1', 'None'])
	})
})
