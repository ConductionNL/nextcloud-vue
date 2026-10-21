/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget `presentation: "table"`: DqTeamwachtrij's
 * "Werkvoorraad per zaaktype", a header row and right-aligned numbers.
 *
 * @spec openspec/changes/record-list-table/specs/record-list-table/spec.md#requirement-a-record-list-can-draw-its-rows-as-a-small-table
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const TYPES = [
	{ id: 'ct-woo', title: 'Woo-verzoek', open: 12, waiting: 4 },
	{ id: 'ct-omg', title: 'Omgevingsvergunning', open: 7, waiting: 0 },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: TYPES, total: 2 } })
})

describe('CnRecordListWidget table', () => {
	it('draws a header and one aligned cell per column, the alert cell bold red', async () => {
		const w = mount(CnRecordListWidget, {
			props: {
				content: {
					register: 'r',
					schema: 'caseType',
					presentation: 'table',
					columns: [
						{ label: 'Case type', value: '{title}' },
						{ label: 'Open', value: '{open}', align: 'end' },
						{ label: 'Waiting', value: '{waiting}', align: 'end', alertAbove: 0 },
					],
					footnote: 'Open with the team',
				},
			},
			global: { stubs: { NcLoadingIcon: true } },
		})
		await flush()
		expect(w.findAll('th').map((th) => th.text())).toEqual(['Case type', 'Open', 'Waiting'])
		const rows = w.findAll('tbody tr')
		expect(rows.map((row) => row.findAll('td').map((td) => td.text()))).toEqual([['Woo-verzoek', '12', '4'], ['Omgevingsvergunning', '7', '0']])
		expect(rows[0].findAll('td')[1].classes()).toContain('cn-record-list__cell--end')
		expect(rows[0].findAll('td')[2].classes()).toContain('cn-record-list__cell--alert')
		expect(rows[1].findAll('td')[2].classes()).not.toContain('cn-record-list__cell--alert')
		expect(rows[0].findAll('td')[1].classes()).not.toContain('cn-record-list__cell--alert')
		expect(w.find('[data-testid="cn-record-list-footnote"]').text()).toBe('Open with the team')
	})
})
