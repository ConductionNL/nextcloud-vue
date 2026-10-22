/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktype's Versies card reads "2 okt 2026 · 31 lopende zaken" on each
 * version: a figure over the version's related objects. A record list's
 * `aggregates` asks it per row, as a table's `aggregate` column does, and
 * offers it to the row's templates under its key.
 *
 * @spec openspec/changes/record-list-row-aggregates/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-figure-over-its-related-objects
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const VERSIONS = [{ id: 'v-4', version: 4, validFrom: '2026-10-02' }, { id: 'v-3', version: 3, validFrom: '2026-05-14' }]
const RUNNING = { 'v-4': 31, 'v-3': 12 }

/**
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * @param {object} content The widget content.
 * @return {object} The wrapper.
 */
function mountList(content) {
	return mount(CnRecordListWidget, {
		props: { content: { register: 'dossiq', schema: 'caseType', presentation: 'rows', title: 'Version {version}', ...content }, objectId: 'v-4', objectData: { id: 'v-4' } },
		global: { stubs: { NcLoadingIcon: true, CnIcon: true }, mocks: { $router: { push: jest.fn(), resolve: () => ({ href: '#' }) } } },
	})
}

const AGGREGATES = { runningCases: { register: 'dossiq', schema: 'case', op: 'count', where: { caseType: '@self.id', isFinalStatus: false } } }

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url, config) => {
		if (url.endsWith('/case')) {
			return Promise.resolve({ data: { results: [], total: RUNNING[config.params.caseType] } })
		}
		return Promise.resolve({ data: { results: VERSIONS, total: 2 } })
	})
})

describe('CnRecordListWidget aggregates', () => {
	it('asks one count per row with the row filled into where', async () => {
		mountList({ meta: '{runningCases} running cases', aggregates: AGGREGATES })
		await flush()
		const asked = axios.get.mock.calls.filter(([url]) => url.endsWith('/case')).map(([, config]) => config.params)
		expect(asked).toEqual([
			{ caseType: 'v-4', isFinalStatus: false, _limit: 0 },
			{ caseType: 'v-3', isFinalStatus: false, _limit: 0 },
		])
	})

	it('offers the figure to the row templates under its key', async () => {
		const w = mountList({ meta: '{runningCases} running cases', aggregates: AGGREGATES })
		await flush()
		expect(w.findAll('.cn-record-list__meta').map((node) => node.text())).toEqual(['31 running cases', '12 running cases'])
	})

	it('asks nothing without aggregates', async () => {
		mountList({ meta: '{validFrom}' })
		await flush()
		expect(axios.get.mock.calls.filter(([url]) => url.endsWith('/case'))).toHaveLength(0)
	})
})
