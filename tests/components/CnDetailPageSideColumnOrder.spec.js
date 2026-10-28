/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the side column puts a notice first and the History card
 * last; `sideColumnOrder: 'declared'` keeps the order of `sideColumn`, for a
 * board that draws History on top (PqMailinglijst).
 *
 * @spec openspec/changes/detail-side-column-order/specs/detail-page/spec.md#requirement-a-detail-page-can-keep-its-side-column-in-the-declared-order
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const WIDGETS = [
	{ id: 'history', type: 'timeline', title: 'History', content: { auditTrail: true } },
	{ id: 'form', type: 'stat', title: 'Sign-up form' },
	{ id: 'preview', type: 'stat', title: 'What a subscriber sees' },
]

function mountPage(extra = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'List',
			register: 'pipelinq',
			schema: 'mailingList',
			objectId: 'l-1',
			look: 'board',
			objectStore: {
				objects: { 'pipelinq-mailingList': { 'l-1': { id: 'l-1' } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			widgets: WIDGETS,
			layout: [{ id: '0', widgetId: 'form', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			sideColumn: ['history', 'form', 'preview'],
			...extra,
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'list' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

const sideIds = (w) => w.vm.sideColumnWidgets.map((widget) => widget.id)

describe('CnDetailPage: side column order in the board look', () => {
	it('puts the History card last by default', async () => {
		const page = mountPage()
		await flushPromises()
		expect(sideIds(page)).toEqual(['form', 'preview', 'history'])
	})

	it('keeps the declared order with sideColumnOrder declared', async () => {
		const page = mountPage({ sideColumnOrder: 'declared' })
		await flushPromises()
		expect(sideIds(page)).toEqual(['history', 'form', 'preview'])
	})
})
