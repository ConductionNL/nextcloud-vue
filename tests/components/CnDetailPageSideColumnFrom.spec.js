/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record can pick the side column and its order (detail-side-column-from):
 * `sideColumnFrom` names a field path, read like a `visibleWhen` field, whose
 * list of ids keeps those `sideColumn` entries in that order. A record that
 * lists nothing keeps the declared column.
 *
 * @spec openspec/changes/detail-side-column-from/specs/detail-page/spec.md#requirement-a-record-can-pick-the-side-column-and-its-order
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const CASE_TYPES = {
	'ct-plain': { id: 'ct-plain', category: 'Vergunningen' },
	'ct-empty': { id: 'ct-empty', category: 'Vergunningen', sideCards: [] },
	'ct-youth': { id: 'ct-youth', category: 'Sociaal domein', sideCards: ['consent', 'people', 'deadline', 'unknown'] },
}

const WIDGETS = [
	{ id: 'deadline', type: 'stat', title: 'Deadline' },
	{ id: 'requester', type: 'stat', title: 'Requester' },
	{ id: 'consent', type: 'stat', title: 'Consent', visibleWhen: { field: '@context.caseType.category', op: 'eq', value: 'Sociaal domein' } },
	{ id: 'people', type: 'stat', title: 'People', visibleWhen: { field: '@context.caseType.category', op: 'eq', value: 'Vergunningen' } },
]

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

function mountPage(caseType, extra = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'case-1',
			objectStore: makeStore({ id: 'case-1', caseType }),
			widgets: WIDGETS,
			layout: [{ id: '0', widgetId: 'deadline', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			sideColumn: ['deadline', 'requester', 'consent', 'people'],
			sideColumnFrom: '@context.caseType.sideCards',
			visibilityContext: { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } },
			...extra,
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

const sideIds = (w) => w.vm.sideColumnWidgets.map((widget) => widget.id)

beforeEach(() => {
	mockFetchJson.mockReset()
	mockFetchJson.mockImplementation(async (url) => {
		const row = CASE_TYPES[url.split('/').pop()]
		if (!row) {
			throw new Error('404')
		}
		return row
	})
})

describe('CnDetailPage: a record picks the side column and its order', () => {
	it('keeps the declared column when the record lists no cards', async () => {
		const plain = mountPage('ct-plain')
		await flushPromises()
		expect(sideIds(plain)).toEqual(['deadline', 'requester', 'people'])
		const empty = mountPage('ct-empty')
		await flushPromises()
		expect(sideIds(empty)).toEqual(['deadline', 'requester', 'people'])
	})

	it('shows the listed cards in the listed order, leaving the rest out', async () => {
		const youth = mountPage('ct-youth')
		await flushPromises()
		// `people` is listed but its own visibleWhen does not hold; `unknown` names no entry.
		expect(sideIds(youth)).toEqual(['consent', 'deadline'])
	})

	it('changes nothing without sideColumnFrom', async () => {
		const youth = mountPage('ct-youth', { sideColumnFrom: '' })
		await flushPromises()
		expect(sideIds(youth)).toEqual(['deadline', 'requester', 'consent'])
	})
})
