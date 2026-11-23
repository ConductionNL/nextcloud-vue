/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list row with a second line under its meta, and rows without a
 * chevron (record-list-row-text).
 *
 * @spec openspec/changes/record-list-row-text/specs/record-list-row-text/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const ROWS = [
	{ id: 'c-1', title: 'Subsidies sportverenigingen', identifier: '2026-0066', idleDays: 12 },
	{ id: 'c-2', title: 'Kapvergunning essen Parkweg', identifier: '2026-0071' },
]

async function mountRows(extra) {
	axios.get.mockResolvedValue({ data: { results: ROWS, total: 2 } })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'case', presentation: 'rows', title: '{title}', meta: '{identifier}', rowRoute: 'CaseDetail', ...extra } },
		global: {
			stubs: { NcLoadingIcon: true, RouterLink: { props: ['to'], template: '<a><slot /></a>' } },
			mocks: { $router: { push: jest.fn(), resolve: () => ({ href: '#' }) } },
		},
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

describe('CnRecordListWidget row text', () => {
	beforeEach(() => axios.get.mockReset())

	it('draws `text` as a line under the meta line of a row', async () => {
		const wrapper = await mountRows({ text: '{idleDays} days idle' })
		const items = wrapper.findAll('[data-testid="cn-record-list-item"]')
		const lines = items.map((item) => item.findAll('.cn-record-list__main > span').map((span) => span.text()))
		expect(lines).toEqual([
			['Subsidies sportverenigingen', '2026-0066', '12 days idle'],
			['Kapvergunning essen Parkweg', '2026-0071'],
		])
		expect(items[0].find('[data-testid="cn-record-list-text"]').classes()).toContain('cn-record-list__meta')
	})

	it('keeps the chevron on a linked row by default', async () => {
		const wrapper = await mountRows({})
		expect(wrapper.findAll('.cn-record-list__chevron')).toHaveLength(2)
	})

	it('leaves the chevron out with `chevron: false`, the row still a link', async () => {
		const wrapper = await mountRows({ chevron: false })
		expect(wrapper.findAll('.cn-record-list__chevron')).toHaveLength(0)
		expect(wrapper.findAll('.cn-record-list__row--link')).toHaveLength(2)
	})
})
