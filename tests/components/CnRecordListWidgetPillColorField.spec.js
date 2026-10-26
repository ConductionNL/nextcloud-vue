/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list pill can take its tone from a colour on the row
 * (`pill.colorField`, a status type's colour name), as DqMijnWerk draws
 * "In behandeling" in purple; `colorMap` still wins.
 *
 * @spec openspec/changes/record-list-pill-color-field/specs/record-list-pill-color-field/spec.md#requirement-a-record-list-pill-can-take-its-tone-from-the-row
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const rows = [
	{ id: 'a', title: 'A', status: { name: 'In behandeling', colour: 'purple' } },
	{ id: 'b', title: 'B', status: { name: 'Besluit', colour: 'teal' } },
]

async function mountList(pill) {
	axios.get.mockResolvedValue({ data: { results: rows, total: rows.length } })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'case', presentation: 'rows', title: '{title}', pill } },
		global: { stubs: { NcLoadingIcon: true, RouterLink: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper.findComponent(CnRecordListWidget)
}

describe('CnRecordListWidget: pill colour from the row', () => {
	it('takes the tone of the row colour', async () => {
		const w = await mountList({ field: 'status.name', colorField: 'status.colour' })
		expect(rows.map((row) => w.vm.pillOf(row).variant)).toEqual(['purple', 'teal'])
	})

	it('lets colorMap win over the row colour', async () => {
		const w = await mountList({ field: 'status.name', colorField: 'status.colour', colorMap: { Besluit: 'success' } })
		expect(w.vm.pillOf(rows[1]).variant).toBe('success')
	})
})
