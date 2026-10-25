/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list with `emptyText: ""` says nothing when it has no rows
 * (DqTermijnen: the quarterly summary line under the table).
 *
 * @spec openspec/changes/record-list-empty-text-none/specs/record-list-empty-text-none/spec.md#requirement-a-record-list-can-say-nothing-when-it-is-empty
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

async function mountList(results, extra) {
	axios.get.mockResolvedValue({ data: { results, total: results.length } })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'case', presentation: 'rows', title: '{title}', ...extra } },
		global: { stubs: { NcLoadingIcon: true, RouterLink: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

describe('CnRecordListWidget: no empty text', () => {
	beforeEach(() => axios.get.mockReset())

	it('draws no empty line with emptyText ""', async () => {
		const wrapper = await mountList([], { emptyText: '' })
		expect(wrapper.find('[data-testid="cn-record-list-empty"]').exists()).toBe(false)
		expect(wrapper.text()).toBe('')
	})

	it('keeps the default empty line without emptyText', async () => {
		const wrapper = await mountList([], {})
		expect(wrapper.find('[data-testid="cn-record-list-empty"]').text()).toBe('Nothing here yet')
	})

	it('still draws the rows with emptyText ""', async () => {
		const wrapper = await mountList([{ id: 'a', title: 'A' }], { emptyText: '' })
		expect(wrapper.text()).toContain('A')
	})
})
