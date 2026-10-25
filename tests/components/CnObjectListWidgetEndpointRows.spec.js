/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list without register/schema reads its rows from an app endpoint
 * (`content.endpointSource`), and its `export` can name an app endpoint:
 * DqZaakAssistent "Wat de assistent op deze zaak deed" reads hermiq's
 * records about the case and downloads them for the AI oversight role.
 *
 * @spec openspec/changes/object-list-endpoint-rows/specs/object-list-widget/spec.md#requirement-a-list-can-read-its-rows-from-an-app-endpoint
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => `/index.php${u}` }))
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	...jest.requireActual('../../src/composables/useEndpointSource.js'),
	fetchEndpointSource: jest.fn(),
}))
jest.mock('../../src/utils/widgetVisibility.js', () => ({
	__esModule: true,
	getCurrentUserGroups: jest.fn(),
}))

const { fetchEndpointSource } = require('../../src/composables/useEndpointSource.js')
const { getCurrentUserGroups } = require('../../src/utils/widgetVisibility.js')
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const SOURCE = { url: '/apps/hermiq/api/ai-oversight/subject', params: { originApp: 'dossiq', subjectId: '@objectId', limit: 25 } }
const ROWS = [{ id: 'a1', prompt: 'Welke documenten moeten nog beoordeeld?', status: 'approved' }, { id: 'a2', prompt: 'Voorstel weigeringsgrond', status: 'denied' }]

function mountWidget(content = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { endpointSource: SOURCE, columns: [{ key: 'prompt', label: 'Question' }], ...content } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		provide: { cnTranslate: (key) => key, cnObjectContext: { objectId: 'case-1', object: { id: 'case-1' } } },
		mocks: { t: (_a, s) => s },
	})
}

const headers = (w) => (w.emitted('header') || []).map(([header]) => header)

describe('CnObjectListWidget endpointSource', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		fetchEndpointSource.mockResolvedValue({ results: ROWS, total: 7 })
		getCurrentUserGroups.mockResolvedValue(['ai-oversight'])
	})

	it('reads its rows and total from the endpoint, for the record', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(fetchEndpointSource).toHaveBeenCalledWith(expect.objectContaining({ url: SOURCE.url, params: SOURCE.params }), expect.objectContaining({ objectId: 'case-1' }))
		expect(w.vm.rows.map((row) => row.id)).toEqual(['a1', 'a2'])
		expect(w.vm.total).toBe(7)
	})

	it('reads the rows at responsePath', async () => {
		fetchEndpointSource.mockResolvedValue({ data: { items: ROWS } })
		const w = mountWidget({ endpointSource: { ...SOURCE, responsePath: 'data.items' } })
		await flushPromises()
		expect(w.vm.rows).toHaveLength(2)
		expect(w.vm.total).toBe(2)
	})

	it('says why when the endpoint refuses', async () => {
		fetchEndpointSource.mockRejectedValue({ response: { status: 403, data: { message: 'Not authorized' } } })
		jest.spyOn(console, 'warn').mockImplementation(() => {})
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.rows).toEqual([])
		expect(w.vm.error).toBe('Not authorized')
	})

	it('downloads an export that names an app endpoint, for the record', async () => {
		const w = mountWidget({ export: { label: 'Download', url: '/apps/hermiq/api/ai-oversight/subject/export', params: { originApp: 'dossiq', subjectId: '@objectId' }, group: 'ai-oversight' } })
		await flushPromises()
		const [header] = headers(w)
		expect(header.action.label).toBe('Download')
		expect(typeof header.action.run).toBe('function')
		expect(w.vm.endpointExportUrl(w.props('content').export)).toBe('/index.php/apps/hermiq/api/ai-oversight/subject/export?originApp=dossiq&subjectId=case-1')
	})

	it('offers the endpoint export to the named group only', async () => {
		getCurrentUserGroups.mockResolvedValue(['handlers'])
		const w = mountWidget({ export: { url: '/apps/hermiq/api/ai-oversight/subject/export', group: 'ai-oversight' } })
		await flushPromises()
		expect(headers(w)).toEqual([])
	})
})
