/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A pill case's label can carry the row's values: board PqVerkoopoverzicht
 * "Recent gewonnen / verloren" draws each deal's amount as a pill, green for
 * a won deal and red for a lost one ("€ 12.500").
 *
 * @spec openspec/changes/record-list-pill-case-template/specs/record-list/spec.md#requirement-a-pill-case-label-can-carry-the-rows-values
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const DEALS = [
	{ id: 'd1', title: 'Inrichting buurthuis Oost', status: 'won', value: 12500 },
	{ id: 'd2', title: 'Fietsenstalling bij het station', status: 'lost', value: 5400 },
	{ id: 'd3', title: 'Zonder bedrag', status: 'won' },
]

const PILL = {
	cases: [
		{ when: { field: 'status', op: 'eq', value: 'won' }, label: '{value|currency}', variant: 'success' },
		{ when: { field: 'status', op: 'eq', value: 'lost' }, label: '{value|currency}', variant: 'error' },
	],
}

async function mountList() {
	axios.get.mockResolvedValue({ data: { results: DEALS, total: 3 } })
	const w = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'lead', presentation: 'rows', title: '{title}', pill: PILL } },
		global: { stubs: { NcLoadingIcon: true, CnIcon: true } },
	})
	await flushPromises()
	return w
}

describe('CnRecordListWidget pill case label from the row', () => {
	it('fills the case label from the row and keeps the case tone', async () => {
		const w = await mountList()
		const rows = w.findAll('.cn-record-list__row, li')
		const badges = w.findAll('.cn-status-badge')
		expect(rows.length).toBeGreaterThan(0)
		expect(badges[0].text()).toMatch(/12[.,]?500/)
		expect(badges[0].text()).not.toContain('{')
		expect(badges[0].classes().join(' ')).toContain('success')
		expect(badges[1].text()).toMatch(/5[.,]?400/)
		expect(badges[1].classes().join(' ')).toContain('error')
	})

	it('draws no pill when the label fills to nothing', async () => {
		const w = await mountList()
		expect(w.findAll('.cn-status-badge')).toHaveLength(2)
	})
})
