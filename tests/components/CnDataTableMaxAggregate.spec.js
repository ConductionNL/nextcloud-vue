/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column aggregate can take the highest value of a field among the related
 * objects (masked-formatter-max-aggregate): DqOrganisaties' "Laatste contact"
 * is the latest contact moment's date per organisation.
 *
 * @spec openspec/changes/masked-formatter-max-aggregate/specs/index-page/spec.md#requirement-a-column-aggregate-can-take-the-highest-value
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [{ id: 'org1', name: 'Buurtvereniging Oost' }, { id: 'org2', name: 'Lumen Infra BV' }]

function mountTable(column) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns: ['name', column] },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

async function flush(wrapper) {
	await new Promise((resolve) => setTimeout(resolve))
	await wrapper.vm.$nextTick()
}

beforeEach(() => axios.get.mockReset())

describe('CnDataTable aggregate op max', () => {
	const column = { key: 'lastContact', label: 'Laatste contact', aggregate: { register: 'dossiq', schema: 'contactmoment', op: 'max', field: 'meta.at', where: { organisation: '@self.id' } } }

	it('asks for the related object with the highest field and shows its value', async () => {
		axios.get.mockImplementation(async (url, { params }) => ({
			data: { total: params.organisation === 'org1' ? 4 : 0, results: params.organisation === 'org1' ? [{ meta: { at: '2026-10-02' } }] : [] },
		}))
		const w = mountTable(column)
		await flush(w)
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/contactmoment', { params: { organisation: 'org1', _limit: 1, '_order[meta.at]': 'desc' } })
		const cells = w.findAll('.cell').map((cell) => cell.text())
		expect(cells).toContain('2026-10-02')
		expect(cells).toContain('—')
	})

	it('names an empty one with zeroLabel', async () => {
		axios.get.mockResolvedValue({ data: { total: 0, results: [] } })
		const w = mountTable({ ...column, aggregate: { ...column.aggregate, zeroLabel: 'Nooit' } })
		await flush(w)
		expect(w.findAll('.cell').map((cell) => cell.text()).filter((t) => t === 'Nooit')).toHaveLength(2)
	})

	it('asks nothing for a max without a field', async () => {
		const w = mountTable({ ...column, aggregate: { ...column.aggregate, field: undefined } })
		await flush(w)
		expect(axios.get).not.toHaveBeenCalled()
	})
})
