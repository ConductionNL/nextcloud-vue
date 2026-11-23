/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list pill can take its colour from the row (`variantWhen`): a
 * finished case is green whatever its case type calls the final status
 * (DqContact and DqOrganisatie "Zaken": "Afgehandeld").
 *
 * @spec openspec/changes/record-list-pill-variant-when/specs/record-list/spec.md#requirement-a-pill-can-take-its-colour-from-the-row
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const CASES = [
	{ id: 'c1', title: 'Verlichting fietspad Lindelaan', status: { name: 'In behandeling' }, isFinalStatus: false },
	{ id: 'c2', title: 'Kapotte lantaarnpaal Lindelaan', status: { name: 'Afgehandeld' }, isFinalStatus: true },
]

describe('CnRecordListWidget pill variantWhen', () => {
	it('colours the pill by the first rule that holds for the row, else the pill\'s own variant', async () => {
		axios.get.mockResolvedValue({ data: { results: CASES, total: 2 } })
		const w = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'case', presentation: 'rows', title: '{title}', pill: { field: 'status.name', variant: 'purple', variantWhen: [{ when: { field: 'isFinalStatus', op: 'eq', value: true }, variant: 'success' }] } } },
			global: { stubs: { NcLoadingIcon: true, CnIcon: true } },
		})
		await flushPromises()
		const badges = w.findAll('.cn-status-badge')
		expect(badges[0].classes().join(' ')).toContain('purple')
		expect(badges[1].classes().join(' ')).toContain('success')
	})
})
