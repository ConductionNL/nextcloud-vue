/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column aggregate can come from the host app's endpoint, asked once for the
 * visible rows, keyed on a row field: DqOrganisaties' "Open tickets", read from
 * pipelinq through dossiq by each organisation's master entity. The column
 * hides when the app behind it is absent, or when the endpoint says so.
 *
 * @spec openspec/changes/aggregate-from-endpoint/specs/cn-data-table/spec.md
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('../../src/utils/appInstalled.js', () => ({ isAppInstalled: jest.fn(() => true) }))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const { isAppInstalled } = jest.requireMock('../../src/utils/appInstalled.js')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [
	{ id: 'org1', name: 'Slagerij', masterEntityRef: 'm1' },
	{ id: 'org2', name: 'CloudGemeente', masterEntityRef: 'm2' },
	{ id: 'org3', name: 'Zonder koppeling' },
]
const column = {
	key: 'openTickets',
	label: 'Open tickets',
	aggregate: { endpoint: '/apps/dossiq/api/parties/open-tickets', key: 'masterEntityRef', requiresApp: 'pipelinq', zeroLabel: 'None' },
}

function mountTable(col = column) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns: ['name', col] },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

async function flush(wrapper) {
	await new Promise((resolve) => setTimeout(resolve))
	await wrapper.vm.$nextTick()
}

const headers = (w) => w.findAll('th').map((th) => th.text())

beforeEach(() => {
	axios.get.mockReset()
	isAppInstalled.mockReturnValue(true)
})

describe('CnDataTable aggregate from an endpoint', () => {
	it('asks the endpoint once with the rows\' keys and shows each row\'s value', async () => {
		axios.get.mockResolvedValue({ data: { available: true, values: { m1: 1, m2: 0 } } })
		const w = mountTable()
		await flush(w)
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/dossiq/api/parties/open-tickets', { params: { keys: ['m1', 'm2'] } })
		expect(w.findAll('.cell').map((c) => c.text())).toEqual(['Slagerij', '1', 'CloudGemeente', 'None', 'Zonder koppeling', 'None'])
		expect(headers(w)).toContain('Open tickets')
	})

	it('hides the column when the endpoint says its source is unavailable', async () => {
		axios.get.mockResolvedValue({ data: { available: false } })
		const w = mountTable()
		await flush(w)
		expect(headers(w)).not.toContain('Open tickets')
	})

	it('hides the column and asks nothing when the app it requires is absent', async () => {
		isAppInstalled.mockReturnValue(false)
		const w = mountTable()
		await flush(w)
		expect(axios.get).not.toHaveBeenCalled()
		expect(headers(w)).not.toContain('Open tickets')
		expect(isAppInstalled).toHaveBeenCalledWith('pipelinq')
	})
})
