/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `checklist` widget ticks a record's checklist through the detail page's
 * record source (record-checklist-widget). For a task the write is the
 * engine's `PATCH /flow-tasks/{uuid}/checklist/{itemId}`; the box follows the
 * task the engine answers with, a refusal is shown as-is, and a finished task
 * is read-only.
 *
 * @spec openspec/changes/record-checklist-widget/specs/record-checklist-widget/spec.md#requirement-a-checklist-widget-ticks-items-through-the-record-source
 */
const mockGet = jest.fn()
const mockPatch = jest.fn()
const mockShowError = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: jest.fn(), patch: (...a) => mockPatch(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}`, generateOcsUrl: (url) => `/ocs${url}` }))
jest.mock('@nextcloud/dialogs', () => ({ showError: (...a) => mockShowError(...a), showSuccess: jest.fn() }))

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnChecklistWidget from '../../src/components/CnChecklistWidget/CnChecklistWidget.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { dashboardWidgetRegistry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnChecklistWidget/index.js'

const UUID = '5b0c9d3e-0000-4000-8000-000000000042'
const ITEMS = [
	{ id: 'a', label: 'Datum met de commissie afstemmen', checked: true },
	{ id: 'b', label: 'Zaal reserveren', checked: false },
	{ label: 'No id, cannot be saved', checked: false },
]
const TASK = { uuid: UUID, title: 'Hoorzitting inplannen', state: 'active', assignee: 'pieter', checklist: ITEMS }

/**
 * Mount the widget with a channel.
 *
 * @param {object} [channel] The provided `cnRecordChecklist`.
 * @param {object} [record] The record.
 * @return {object} The wrapper.
 */
function mountWidget(channel = null, record = TASK) {
	return mount(CnChecklistWidget, {
		props: { objectData: record, content: {} },
		global: { provide: { cnRecordChecklist: channel } },
	})
}

beforeEach(() => {
	setActivePinia(createPinia())
	mockGet.mockReset()
	mockPatch.mockReset()
	mockShowError.mockReset()
	mockGet.mockResolvedValue({ data: TASK })
})

describe('the checklist widget', () => {
	it('is a registered catalog widget', () => {
		expect(dashboardWidgetRegistry.checklist.renderer).toBe(CnChecklistWidget)
	})

	it('lists the items with an id and says how many are done', () => {
		const wrapper = mountWidget()

		expect(wrapper.findAll('[data-testid^="cn-checklist-item-"]')).toHaveLength(2)
		expect(wrapper.find('[data-testid="cn-checklist-summary"]').text()).toBe('1 of 2 done')
	})

	it('is read-only without a source that can write', () => {
		const wrapper = mountWidget()
		expect(wrapper.vm.writable).toBe(false)
	})

	it('writes a tick through the channel', async () => {
		const check = jest.fn().mockResolvedValue(true)
		const wrapper = mountWidget({ canCheck: true, check })

		await wrapper.vm.toggle({ id: 'b' }, true)

		expect(check).toHaveBeenCalledWith('b', true)
	})
})

describe('a detail page on the tasks source ticks through the engine', () => {
	/**
	 * Mount the page.
	 *
	 * @return {object} The wrapper.
	 */
	function mountPage() {
		return mount(CnDetailPage, {
			props: { title: 'Task', entitySource: 'tasks', objectId: UUID },
			global: {
				stubs: {
					NcBreadcrumbs: { template: '<nav><slot /></nav>' },
					NcBreadcrumb: { props: ['name'], template: '<span>{{ name }}</span>' },
					CnDashboardGrid: { template: '<div />' },
					CnDetailWidgetHost: { template: '<div />' },
				},
			},
		})
	}

	it('patches the item and takes the task the engine answers with', async () => {
		mockPatch.mockResolvedValue({ status: 200, data: { ...TASK, checklist: [ITEMS[0], { ...ITEMS[1], checked: true }] } })
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.recordCanCheckItems).toBe(true)
		expect(await wrapper.vm.checkSourceItem('b', true)).toBe(true)

		expect(mockPatch).toHaveBeenCalledWith(`/index.php/apps/openregister/api/flow-tasks/${UUID}/checklist/b`, null, { params: { checked: 'true' } })
		expect(wrapper.vm.currentObject.checklist[1].checked).toBe(true)
	})

	it('shows the engine refusal as-is and keeps the item', async () => {
		mockPatch.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403, data: { error: 'Only the assignee may tick this checklist' } } }))
		const wrapper = mountPage()
		await flushPromises()

		expect(await wrapper.vm.checkSourceItem('b', true)).toBe(false)

		expect(mockShowError).toHaveBeenCalledWith('Only the assignee may tick this checklist')
		expect(wrapper.vm.currentObject.checklist[1].checked).toBe(false)
	})

	it('cannot tick a finished task', async () => {
		mockGet.mockResolvedValue({ data: { ...TASK, state: 'completed' } })
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.recordCanCheckItems).toBe(false)
		expect(await wrapper.vm.checkSourceItem('b', true)).toBe(false)
		expect(mockPatch).not.toHaveBeenCalled()
	})
})
