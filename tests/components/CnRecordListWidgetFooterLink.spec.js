/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list can end with a text link under its rows
 * (DqDagAfsluiten "Naar Mijn werk", DqDashboard "Alles bekijken").
 *
 * @spec openspec/changes/record-list-footer-link/specs/record-list-footer-link/spec.md#requirement-a-record-list-can-end-with-a-text-link
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
		global: { stubs: { NcLoadingIcon: true, RouterLink: { props: ['to'], template: '<a class="rl" :data-to="JSON.stringify(to)"><slot /></a>' } } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

describe('CnRecordListWidget: the footer link', () => {
	beforeEach(() => axios.get.mockReset())

	it('draws a text link under the rows, its total filled', async () => {
		const wrapper = await mountList([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], { footerLink: { label: 'All {total}', route: 'Cases', query: { _watching: 'true' } } })
		const link = wrapper.find('[data-testid="cn-record-list-footer-link"]')
		expect(link.exists()).toBe(true)
		expect(link.text()).toBe('All 2')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'Cases', query: { _watching: 'true' } })
	})

	it('draws nothing under an empty list', async () => {
		const wrapper = await mountList([], { footerLink: { label: 'All', route: 'Cases' } })
		expect(wrapper.find('[data-testid="cn-record-list-footer-link"]').exists()).toBe(false)
	})

	it('draws an href link too', async () => {
		const wrapper = await mountList([{ id: 'a', title: 'A' }], { footerLink: { label: 'Docs', href: 'https://example.org' } })
		expect(wrapper.find('[data-testid="cn-record-list-footer-link"]').attributes('href')).toBe('https://example.org')
	})
})
