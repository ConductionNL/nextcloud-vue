/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A rows record list can draw its due text under the title
 * (DqDagAfsluiten "Morgen eerst": "3 dagen te laat" under the task).
 *
 * @spec openspec/changes/record-list-due-below/specs/record-list-due-below/spec.md#requirement-a-rows-due-text-can-sit-under-its-title
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)

async function mountRows(extra) {
	axios.get.mockResolvedValue({ data: { results: [{ id: 't-1', title: 'Zienswijze vragen', dueAt: threeDaysAgo }], total: 1 } })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'task', presentation: 'rows', title: '{title}', due: { field: 'dueAt' }, ...extra } },
		global: { stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

describe('CnRecordListWidget: the due text under the title', () => {
	beforeEach(() => axios.get.mockReset())

	it('draws the due line in the main column with duePlacement below', async () => {
		const wrapper = await mountRows({ duePlacement: 'below' })
		const due = wrapper.find('[data-testid="cn-record-list-due"]')
		expect(due.text()).toBe('3 days overdue')
		expect(due.element.closest('.cn-record-list__main')).not.toBeNull()
		expect(due.classes()).toContain('cn-record-list__due--below')
		expect(due.classes()).toContain('cn-record-list__due--danger')
		expect(wrapper.find('.cn-record-list__aside').exists()).toBe(false)
	})

	it('keeps it at the end of the row by default', async () => {
		const wrapper = await mountRows({})
		const due = wrapper.find('[data-testid="cn-record-list-due"]')
		expect(due.element.closest('.cn-record-list__aside')).not.toBeNull()
		expect(due.classes()).not.toContain('cn-record-list__due--below')
	})
})
