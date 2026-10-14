/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail grid widget's `visibleWhen` is read against the loaded record and
 * the records `visibilityContext` names (a case's case type), so a manifest
 * can keep the family plan off a Woo request.
 *
 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md#requirement-a-detail-grid-widget-shows-only-while-its-visiblewhen-holds-for-the-record
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

const mockEvaluate = jest.fn()
jest.mock('../../src/utils/visibleWhen.js', () => {
	const actual = jest.requireActual('../../src/utils/visibleWhen.js')
	return { ...actual, evaluateVisibleWhen: (...a) => mockEvaluate(...a) }
})

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const CASE_TYPES = {
	'ct-youth': { id: 'ct-youth', category: 'Sociaal domein' },
	'ct-woo': { id: 'ct-woo', category: 'Transparantie' },
}

const WIDGETS = [
	{ id: 'case-data', type: 'stat', title: 'Data' },
	{ id: 'family-plan', type: 'stat', title: 'Family plan', visibleWhen: { field: '@context.caseType.category', op: 'in', value: ['Sociaal domein'] } },
	{ id: 'open-only', type: 'stat', title: 'Open', visibleWhen: { field: 'status', op: 'eq', value: 'open' } },
	{ id: 'remote', type: 'stat', title: 'Remote', visibleWhen: { source: { register: 'dossiq', schema: 'role' }, op: 'gt', value: 0 } },
]

const LAYOUT = WIDGETS.map((w, i) => ({ id: String(i), widgetId: w.id, gridX: 0, gridY: i * 2, gridWidth: 12, gridHeight: 2 }))

function makeStore(object) {
	return {
		objects: { 'dossiq-case': { 'case-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountPage(object, extra = {}, provide = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'case-1',
			objectStore: makeStore(object),
			widgets: WIDGETS,
			layout: LAYOUT,
			visibilityContext: { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } },
			...extra,
		},
		global: {
			provide,
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

const ids = (w) => w.vm.bodyGridLayout.map((i) => i.widgetId)

beforeEach(() => {
	mockFetchJson.mockReset()
	mockFetchJson.mockImplementation(async (url) => {
		const row = CASE_TYPES[url.split('/').pop()]
		if (!row) {
			throw new Error('404')
		}
		return row
	})
	mockEvaluate.mockReset()
	mockEvaluate.mockResolvedValue(false)
})

describe('CnDetailPage: a grid widget follows its visibleWhen on the record', () => {
	it('shows the family plan on a youth case and not on a Woo request', async () => {
		const youth = mountPage({ id: 'case-1', caseType: 'ct-youth', status: 'open' })
		await flushPromises()
		expect(ids(youth)).toEqual(['case-data', 'family-plan', 'open-only'])
		youth.unmount()

		const woo = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'closed' })
		await flushPromises()
		expect(ids(woo)).toEqual(['case-data'])
		expect(mockFetchJson).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/caseType/ct-woo')
		woo.unmount()
	})

	it('keeps a conditional widget out until the case type has been read', async () => {
		let release
		mockFetchJson.mockImplementation(() => new Promise((resolve) => {
			release = () => resolve(CASE_TYPES['ct-youth'])
		}))
		const w = mountPage({ id: 'case-1', caseType: 'ct-youth', status: 'open' })
		await Promise.resolve()
		expect(ids(w)).toEqual(['case-data'])
		release()
		await flushPromises()
		expect(ids(w)).toContain('family-plan')
		w.unmount()
	})

	it('hides a case-type widget when the case type cannot be read', async () => {
		const w = mountPage({ id: 'case-1', caseType: 'ct-missing', status: 'open' })
		await flushPromises()
		expect(ids(w)).toEqual(['case-data', 'open-only'])
		w.unmount()
	})

	it('asks a source condition once and follows its answer', async () => {
		mockEvaluate.mockResolvedValue(true)
		const w = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'closed' })
		await flushPromises()
		expect(ids(w)).toEqual(['case-data', 'remote'])
		expect(mockEvaluate).toHaveBeenCalledTimes(1)
		expect(mockEvaluate.mock.calls[0][1].object['@context'].caseType).toEqual(CASE_TYPES['ct-woo'])
		w.unmount()
	})

	it('changes nothing for a page without visibleWhen or visibilityContext', async () => {
		const plain = WIDGETS.map(({ visibleWhen: _v, ...w }) => w)
		const w = mountPage({ id: 'case-1' }, { widgets: plain, visibilityContext: {} })
		await flushPromises()
		expect(ids(w)).toEqual(['case-data', 'family-plan', 'open-only', 'remote'])
		expect(mockFetchJson).not.toHaveBeenCalled()
		w.unmount()
	})

	it('hides nothing in edit mode', async () => {
		const w = mountPage({ id: 'case-1', caseType: 'ct-woo' }, {}, { cnEditingBody: true })
		await flushPromises()
		expect(ids(w)).toHaveLength(4)
		w.unmount()
	})
})
