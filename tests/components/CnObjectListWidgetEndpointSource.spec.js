/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.endpointSource` reads an object list's rows from an app endpoint
 * instead of an OpenRegister list, for rows the app serves under its own read
 * rules: dossiq's AI-toezicht lists hermiq's oversight records of one case
 * through `/apps/hermiq/api/ai-oversight/subject` (DqZaakAssistent).
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))

const axios = require('@nextcloud/axios').default

function mountList(content) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { columns: [{ key: 'prompt', label: 'Question' }], ...content } },
		provide: { cnObjectContext: { objectId: 'case-1', object: { id: 'case-1' } } },
		stubs: { CnDataTable: true },
	})
}

const SOURCE = {
	url: '/apps/hermiq/api/ai-oversight/subject',
	params: { originApp: 'dossiq', subjectId: '@objectId' },
	responsePath: 'results',
}

beforeEach(() => {
	invalidateEndpointSourceCache()
	axios.get.mockReset()
})

describe('CnObjectListWidget — endpointSource', () => {
	it('reads the rows from the endpoint, with the record\'s tokens resolved', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'a-1', prompt: 'Welke documenten?' }, { id: 'a-2', prompt: 'Samenvatting' }] } })
		const w = mountList({ endpointSource: SOURCE })
		await flushPromises()
		const [url, options] = axios.get.mock.calls[0]
		expect(url).toContain('/apps/hermiq/api/ai-oversight/subject')
		expect(options.params).toEqual({ originApp: 'dossiq', subjectId: 'case-1' })
		expect(w.vm.rows.map((row) => row.id)).toEqual(['a-1', 'a-2'])
		expect(w.vm.total).toBe(2)
	})

	it('takes a `{ results, total }` payload as well', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'a-1' }], total: 7 } })
		const w = mountList({ endpointSource: { ...SOURCE, responsePath: '' } })
		await flushPromises()
		expect(w.vm.rows).toHaveLength(1)
		expect(w.vm.total).toBe(7)
	})

	it('does not ask OpenRegister when an endpoint is set', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		mountList({ endpointSource: SOURCE, register: 'hermiq', schema: 'approval' })
		await flushPromises()
		expect(axios.get.mock.calls.every(([url]) => !url.includes('/apps/openregister/api/objects/'))).toBe(true)
	})

	it('shows the load error, not stale rows, when the endpoint refuses', async () => {
		jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get.mockRejectedValue(new Error('403'))
		const w = mountList({ endpointSource: SOURCE })
		await flushPromises()
		expect(w.vm.rows).toEqual([])
		expect(w.vm.error).toBe('403')
	})
})
