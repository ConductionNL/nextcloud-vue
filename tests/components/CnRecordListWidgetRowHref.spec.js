/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list row can open a page outside the app (record-list-row-href):
 * pipelinq's client page lists the client's cases, which live in dossiq.
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const CASES = [
	{ id: 'c1', title: 'Subsidie voor het straatfeest', url: '/index.php/apps/dossiq/cases/c1' },
	{ id: 'c2', title: 'Evenementenvergunning', url: 'javascript:alert(1)' },
	{ id: 'c3', title: 'Melding speeltoestel', url: '//elsewhere.example/cases/c3' },
	{ id: 'c4', title: 'Zonder link' },
]

function mountList(content) {
	return mount(CnRecordListWidget, {
		props: { content: { endpointSource: { url: '/apps/pipelinq/api/clients/x/cases', responsePath: 'results' }, presentation: 'rows', title: '{title}', ...content } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { results: CASES } })
})

describe('CnRecordListWidget rowHrefField', () => {
	it('links a row to the URL in its field, with the chevron, and leaves an unsafe or missing URL unlinked', async () => {
		const w = mountList({ rowHrefField: 'url' })
		await flush()
		const rows = w.findAll('.cn-record-list__row')
		expect(rows.map((row) => row.element.tagName)).toEqual(['A', 'DIV', 'DIV', 'DIV'])
		expect(rows[0].attributes('href')).toBe('/index.php/apps/dossiq/cases/c1')
		expect(rows[0].find('.cn-record-list__chevron').exists()).toBe(true)
		expect(rows[1].find('.cn-record-list__chevron').exists()).toBe(false)
	})

	it('draws plain rows without the key', async () => {
		const w = mountList({})
		await flush()
		expect(w.findAll('.cn-record-list__row').map((row) => row.element.tagName)).toEqual(['DIV', 'DIV', 'DIV', 'DIV'])
	})

	it('draws only the first `limit` rows and still counts them all', async () => {
		const w = mountList({ rowHrefField: 'url', limit: 2, headerCount: true })
		await flush()
		expect(w.findAll('.cn-record-list__row')).toHaveLength(2)
		const headers = w.emitted('header')
		expect(headers[headers.length - 1][0].count).toBe(4)
	})
})
