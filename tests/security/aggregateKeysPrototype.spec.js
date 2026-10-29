/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Row ids and figure keys come from records and manifests. A `__proto__`,
 * `constructor` or `prototype` among them is an ordinary key: it never
 * reaches Object.prototype (CodeQL js/prototype-polluting-assignment).
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('../../src/utils/appInstalled.js', () => ({ isAppInstalled: jest.fn(() => true) }))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const { cellsOf } = require('../../src/utils/rowAggregate.js')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const CnRecordListWidget = require('../../src/components/CnRecordListWidget/CnRecordListWidget.vue').default

const HOSTILE = ['__proto__', 'constructor', 'prototype']

/**
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

afterEach(() => {
	delete Object.prototype.polluted
})

describe('cellsOf', () => {
	it.each(HOSTILE)('keeps a row %s as its own entry', (id) => {
		const rows = new Map()
		const cells = cellsOf(rows, id)
		cells.polluted = 'yes'
		cells[id] = 'yes'
		expect(cellsOf(rows, id)).toBe(cells)
		expect({}.polluted).toBeUndefined()
		expect(Object.getPrototypeOf(cells)).toBeNull()
		expect(Object.keys(Object.fromEntries(rows))).toEqual([id])
	})

	it('reads a row id as a string', () => {
		const rows = new Map()
		expect(cellsOf(rows, 5)).toBe(cellsOf(rows, '5'))
	})
})

describe('CnDataTable aggregate with hostile keys', () => {
	it('keeps an endpoint figure for a __proto__ row off Object.prototype', async () => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { available: true, values: { m1: 7 } } })
		const w = mount(CnDataTable, {
			propsData: {
				rows: [{ id: '__proto__', masterEntityRef: 'm1' }],
				columns: ['id', { key: 'polluted', label: 'Tickets', aggregate: { endpoint: '/apps/x/api/counts', key: 'masterEntityRef' } }],
			},
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
		})
		await flush()
		await w.vm.$nextTick()
		expect({}.polluted).toBeUndefined()
		expect(w.findAll('.cell').map((c) => c.text())).toContain('7')
	})
})

describe('CnRecordListWidget aggregates with hostile keys', () => {
	it.each(HOSTILE)('keeps a %s row and figure off Object.prototype', async (key) => {
		axios.get.mockReset()
		axios.get.mockImplementation((url) => Promise.resolve(url.endsWith('/case')
			? { data: { results: [], total: 4 } }
			: { data: { results: [{ id: key, title: 'Row' }], total: 1 } }))
		const w = mount(CnRecordListWidget, {
			props: {
				content: {
					register: 'dossiq',
					schema: 'caseType',
					presentation: 'rows',
					title: '{title}',
					meta: '{polluted} running',
					aggregates: { polluted: { register: 'dossiq', schema: 'case', op: 'count' }, [key]: { register: 'dossiq', schema: 'case', op: 'count' } },
				},
				objectId: 'x',
				objectData: { id: 'x' },
			},
			global: { stubs: { NcLoadingIcon: true, CnIcon: true }, mocks: { $router: { push: jest.fn(), resolve: () => ({ href: '#' }) } } },
		})
		await flush()
		await w.vm.$nextTick()
		expect({}.polluted).toBeUndefined()
		expect(w.findAll('.cn-record-list__meta').map((node) => node.text())).toEqual(['4 running'])
	})
})
