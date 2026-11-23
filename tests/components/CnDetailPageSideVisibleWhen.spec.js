/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A side column widget's `visibleWhen` is read exactly as a grid widget's
 * (detail-side-visible-when): against the record (local fields), the records
 * `visibilityContext` names (@context.caseType.*), and the answers of endpoint
 * and source conditions. Inline definitions and string references alike.
 *
 * @spec openspec/changes/detail-side-visible-when/specs/detail-page/spec.md#requirement-a-side-column-widget-shows-only-while-its-visiblewhen-holds
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
	'ct-objection': { id: 'ct-objection', category: 'Bezwaar' },
	'ct-woo': { id: 'ct-woo', category: 'Transparantie' },
}

const WIDGETS = [
	{ id: 'deadline', type: 'stat', title: 'Deadline' },
	{ id: 'committee', type: 'stat', title: 'Committee', visibleWhen: { field: '@context.caseType.category', op: 'eq', value: 'Bezwaar' } },
]

const SIDE = [
	'deadline',
	'committee',
	{ type: 'stat', title: 'Open only', visibleWhen: { field: 'status', op: 'eq', value: 'open' } },
	{ id: 'remote', type: 'stat', title: 'Remote', visibleWhen: { source: { register: 'dossiq', schema: 'role' }, op: 'gt', value: 0 } },
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

function mountPage(object, extra = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'case-1',
			objectStore: makeStore(object),
			widgets: WIDGETS,
			layout: [{ id: '0', widgetId: 'deadline', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			sideColumn: SIDE,
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
	mockEvaluate.mockReset()
	mockEvaluate.mockResolvedValue(false)
})

describe('CnDetailPage: a side column widget follows its visibleWhen', () => {
	it('shows the committee card on an objection, not on a Woo request (string reference, @context)', async () => {
		const objection = mountPage({ id: 'case-1', caseType: 'ct-objection', status: 'closed' })
		await flushPromises()
		expect(sideIds(objection)).toContain('committee')
		const woo = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'closed' })
		await flushPromises()
		expect(sideIds(woo)).not.toContain('committee')
		expect(sideIds(woo)).toContain('deadline')
	})

	it('reads a local field condition on an inline definition', async () => {
		const open = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'open' })
		await flushPromises()
		expect(sideIds(open)).toContain('cn-side-2')
		const closed = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'closed' })
		await flushPromises()
		expect(sideIds(closed)).not.toContain('cn-side-2')
	})

	it('asks an endpoint or source condition and follows its answer', async () => {
		mockEvaluate.mockResolvedValue(true)
		const w = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'closed' })
		await flushPromises()
		expect(mockEvaluate).toHaveBeenCalled()
		expect(sideIds(w)).toContain('remote')
		mockEvaluate.mockResolvedValue(false)
		const hidden = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'closed' })
		await flushPromises()
		expect(sideIds(hidden)).not.toContain('remote')
	})

	it('draws no side column when every side widget is hidden', async () => {
		const w = mountPage({ id: 'case-1', caseType: 'ct-woo', status: 'closed' }, { sideColumn: ['committee'] })
		await flushPromises()
		expect(w.vm.sideColumnWidgets).toEqual([])
		expect(w.vm.showsSideColumn).toBe(false)
	})
})
