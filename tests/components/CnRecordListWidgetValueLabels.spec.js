/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list template can show a label for a stored value (valueLabels):
 * pipelinq's My work printed "{channel}" as stored, and its data holds both
 * "phone" and "telefoon".
 *
 * @spec openspec/changes/screens-record-list-value-labels/specs/record-list-value-labels/spec.md#requirement-a-record-list-template-can-show-a-label-for-a-stored-value
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const ROWS = [
	{ id: 't-1', title: 'A', client: 'Sanne', channel: 'phone', status: 'new' },
	{ id: 't-2', title: 'B', client: 'Joris', channel: 'telefoon', status: 'new' },
	{ id: 't-3', title: 'C', client: 'Fatma', channel: 'balie', status: 'new' },
]

async function metas(content, translate) {
	axios.get.mockResolvedValue({ data: { results: ROWS, total: 3 } })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'ticket', title: '{title}', meta: '{client} · {channel}', ...content } },
		global: { provide: translate ? { cnTranslate: translate } : {}, stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper.findAll('[data-testid="cn-record-list-item"]').map((item) => item.find('.cn-record-list__meta').text())
}

describe('CnRecordListWidget valueLabels', () => {
	beforeEach(() => axios.get.mockReset())

	it('shows the translated label of a stored value, for every spelling the map names', async () => {
		const translate = (key) => ({ Phone: 'Telefoon' }[key] || key)
		expect(await metas({ valueLabels: { channel: { phone: 'Phone', telefoon: 'Phone' } } }, translate))
			.toEqual(['Sanne · Telefoon', 'Joris · Telefoon', 'Fatma · balie'])
	})

	it('prints the stored value without a map', async () => {
		expect(await metas({})).toEqual(['Sanne · phone', 'Joris · telefoon', 'Fatma · balie'])
	})
})
