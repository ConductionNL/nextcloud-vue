/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `table` column may name candidate templates, the first that fills shown
 * (DqSociaalDomein "Andere zaken van dit huishouden": a case the reader may
 * open beside one that only says it exists).
 *
 * @spec openspec/changes/record-list-table-column-candidates/specs/record-list-table/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const ROWS = [
	{ caseId: 'c2', identifier: '2025-0412', title: 'Wmo huishoudelijke hulp', caseTypeTitle: 'Wmo-maatwerkvoorziening', statusLabel: 'In behandeling', statusRole: 'in-progress', access: 'full' },
	{ exists: true, domain: 'Participatiewet', contact: 'Team Werk en inkomen' },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { results: ROWS } })
})

describe('CnRecordListWidget table column candidates', () => {
	it('shows the first candidate that fills, per row', async () => {
		const w = mount(CnRecordListWidget, {
			props: {
				content: {
					endpointSource: { url: '/apps/dossiq/api/cases/c1/household-cases', responsePath: 'results' },
					presentation: 'table',
					valueLabels: { access: { full: 'Yes' } },
					columns: [
						{ label: 'Case', value: ['{identifier} {title}', '{domain}'] },
						{ label: 'Case type', value: ['{caseTypeTitle}', 'Contact: {contact}'] },
						{ label: 'Status', value: '{statusLabel}', tone: { field: 'statusRole', map: { 'in-progress': 'purple' } } },
						{ label: 'Visible to you', value: ['{access}', 'Only that it exists'] },
					],
				},
			},
		})
		await flush()
		const cells = w.findAll('[data-testid="cn-record-list-item"]').map((row) => row.findAll('td').map((td) => td.text()))
		expect(cells).toEqual([
			['2025-0412 Wmo huishoudelijke hulp', 'Wmo-maatwerkvoorziening', 'In behandeling', 'Yes'],
			['Participatiewet', 'Contact: Team Werk en inkomen', '', 'Only that it exists'],
		])
		expect(w.findAll('th').map((th) => th.text())).toEqual(['Case', 'Case type', 'Status', 'Visible to you'])
		// The status pill only where there is a status.
		const rows = w.findAll('[data-testid="cn-record-list-item"]')
		expect(rows[0].findAll('td')[2].findComponent({ name: 'CnStatusBadge' }).exists()).toBe(true)
		expect(rows[1].findAll('td')[2].findComponent({ name: 'CnStatusBadge' }).exists()).toBe(false)
	})
})
