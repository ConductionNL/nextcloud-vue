/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `rows` record list can lead each row with a short text before the title,
 * as board PtDashboard draws "Recente inzendingen": the time of day in a
 * column of its own ("09.15"), then the title and its meta, then the pill.
 *
 * @spec openspec/changes/record-list-leading/specs/record-list-leading/spec.md#requirement-a-record-list-row-can-lead-with-a-short-text
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const ROWS = [
	{ id: 'a', actionId: 'Grof afval laten ophalen', submittedAt: '2026-10-21T09:15:00' },
	{ id: 'b', actionId: 'Melding openbare ruimte', submittedAt: '' },
]

/**
 * @param {object} content The content.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The list.
 */
async function mountList(content) {
	axios.get.mockResolvedValue({ data: { results: ROWS, total: 2 } })
	const w = mount(CnRecordListWidget, {
		props: { content },
		global: { stubs: { NcLoadingIcon: true, CnIcon: true } },
	})
	await flushPromises()
	return w
}

describe('CnRecordListWidget leading', () => {
	it('draws the leading text before the title, and nothing where it is empty', async () => {
		const w = await mountList({ register: 'portaliq', schema: 'portalSubmission', title: '{actionId}', leading: '{submittedAt|time}' })
		const rows = w.findAll('[data-testid="cn-record-list-item"]')
		const first = rows[0].find('[data-testid="cn-record-list-leading"]')
		expect(first.exists()).toBe(true)
		expect(first.text()).toMatch(/^09[.:]15$/)
		const order = [...rows[0].element.querySelectorAll('.cn-record-list__leading, .cn-record-list__title')].map((e) => e.className)
		expect(order[0]).toContain('cn-record-list__leading')
		expect(rows[1].find('[data-testid="cn-record-list-leading"]').exists()).toBe(false)
	})

	it('draws no leading column without the key', async () => {
		const w = await mountList({ register: 'portaliq', schema: 'portalSubmission', title: '{actionId}' })
		expect(w.find('[data-testid="cn-record-list-leading"]').exists()).toBe(false)
	})
})
