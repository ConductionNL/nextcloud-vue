/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The tasks source offers Edit on an open task (DqTaak "Bewerken"): a form
 * with the title, description, due date and priority, saved through the
 * engine's `PATCH /api/flow-tasks/{uuid}`. Who may edit is the engine's call;
 * a refusal is shown as-is and the task stays as it was.
 *
 * @spec openspec/changes/task-edit-action/specs/record-source-verbs/spec.md#requirement-a-record-source-verb-can-ask-for-values-first
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPatch = jest.fn()
const mockShowError = jest.fn()
const mockShowSuccess = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a), patch: (...a) => mockPatch(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}`, generateOcsUrl: (url) => `/ocs${url}` }))
jest.mock('@nextcloud/dialogs', () => ({ showError: (...a) => mockShowError(...a), showSuccess: (...a) => mockShowSuccess(...a) }))

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { resolveRecordSource } from '../../src/composables/indexSources.js'

const UUID = '5b0c9d3e-0000-4000-8000-000000000042'
const TASK = { uuid: UUID, title: 'Hoorzitting inplannen', description: 'Plan de hoorzitting', state: 'active', priority: 'high', assignee: 'pieter', dueAt: '2026-10-21T00:00:00+00:00', requester: 'anouk' }

const FormDialogStub = {
	name: 'CnFormDialog',
	props: ['schema', 'item', 'dialogTitle', 'fieldOverrides'],
	emits: ['confirm', 'close'],
	data: () => ({ result: null }),
	methods: {
		setResult(result) {
			this.result = result
		},
	},
	template: '<div data-testid="stub-form-dialog" />',
}

/**
 * @return {object} The page on the tasks source.
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
				CnFormDialog: FormDialogStub,
			},
			provide: { cnLook: 'board' },
		},
	})
}

beforeEach(() => {
	setActivePinia(createPinia())
	for (const mock of [mockGet, mockPost, mockPatch, mockShowError, mockShowSuccess]) {
		mock.mockReset()
	}
	mockGet.mockResolvedValue({ data: TASK })
})

describe('the tasks source offers Edit', () => {
	it('on an open task, as a button with a form of the four fields', () => {
		const edit = resolveRecordSource('tasks').verbs(TASK).find((verb) => verb.id === 'edit')
		expect(edit.menu).toBe(false)
		expect(Object.keys(edit.form.schema.properties)).toEqual(['title', 'description', 'dueAt', 'priority'])
		expect(edit.form.item).toEqual({ title: 'Hoorzitting inplannen', description: 'Plan de hoorzitting', dueAt: '2026-10-21', priority: 'high' })
	})

	it('not on a finished task', () => {
		expect(resolveRecordSource('tasks').verbs({ ...TASK, state: 'completed' })).toEqual([])
	})
})

describe('editing a task from its page', () => {
	it('opens the form instead of posting a verb', async () => {
		const wrapper = mountPage()
		await flushPromises()
		await wrapper.find('[data-testid="cn-detail-page-verb-edit"]').trigger('click')
		await flushPromises()

		const dialog = wrapper.findComponent(FormDialogStub)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('item')).toMatchObject({ title: 'Hoorzitting inplannen', dueAt: '2026-10-21' })
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('patches the engine with the four fields and redraws from the answer', async () => {
		mockPatch.mockResolvedValue({ status: 200, data: { ...TASK, title: 'Hoorzitting plannen' } })
		const wrapper = mountPage()
		await flushPromises()
		await wrapper.find('[data-testid="cn-detail-page-verb-edit"]').trigger('click')
		await flushPromises()

		const dialog = wrapper.findComponent(FormDialogStub)
		dialog.vm.$emit('confirm', { title: 'Hoorzitting plannen', description: 'Plan de hoorzitting', dueAt: '2026-10-28', priority: 'urgent', uuid: UUID, state: 'active' })
		await flushPromises()

		expect(mockPatch).toHaveBeenCalledWith(
			`/index.php/apps/openregister/api/flow-tasks/${UUID}`,
			{ title: 'Hoorzitting plannen', description: 'Plan de hoorzitting', dueAt: '2026-10-28', priority: 'urgent' },
		)
		expect(dialog.vm.result).toEqual({ success: true })
		expect(wrapper.vm.currentObject.title).toBe('Hoorzitting plannen')
	})

	it('hands the engine\'s refusal to the form and keeps the task', async () => {
		mockPatch.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403, data: { error: "Verb 'edit' denied: not a member of the task's candidate pool." } } }))
		const wrapper = mountPage()
		await flushPromises()
		await wrapper.find('[data-testid="cn-detail-page-verb-edit"]').trigger('click')
		await flushPromises()

		const dialog = wrapper.findComponent(FormDialogStub)
		dialog.vm.$emit('confirm', { title: 'Mine now' })
		await flushPromises()

		expect(dialog.vm.result).toEqual({ error: "Verb 'edit' denied: not a member of the task's candidate pool." })
		expect(wrapper.vm.currentObject.title).toBe('Hoorzitting inplannen')
	})
})
