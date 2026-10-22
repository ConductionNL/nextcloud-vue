/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record source offers header verbs, and CnDetailPage draws them
 * (record-source-verbs). For the `tasks` source these are the engine's claim,
 * hand back, complete and cancel, offered from the task's own state. A
 * refusal is shown with the engine's message as-is, and an app route can
 * stand in for one verb.
 *
 * @spec openspec/changes/record-source-verbs/specs/record-source-verbs/spec.md#requirement-a-record-source-offers-header-verbs
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockShowError = jest.fn()
const mockShowSuccess = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}`, generateOcsUrl: (url) => `/ocs${url}` }))
jest.mock('@nextcloud/dialogs', () => ({ showError: (...a) => mockShowError(...a), showSuccess: (...a) => mockShowSuccess(...a) }))

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { resolveRecordSource } from '../../src/composables/indexSources.js'

const UUID = '5b0c9d3e-0000-4000-8000-000000000042'
const TASK = { uuid: UUID, title: 'Hoorzitting inplannen', state: 'active', priority: 'high', assignee: 'pieter' }

/**
 * Mount a detail page on the tasks source.
 *
 * @param {object} [props] Extra page props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return mount(CnDetailPage, {
		props: { title: 'Task', entitySource: 'tasks', objectId: UUID, ...props },
		global: {
			stubs: {
				NcBreadcrumbs: { template: '<nav><slot /></nav>' },
				NcBreadcrumb: { props: ['name'], template: '<span>{{ name }}</span>' },
				CnDashboardGrid: { template: '<div />' },
				CnDetailWidgetHost: { template: '<div />' },
			},
			provide: { cnLook: 'board' },
		},
	})
}

/**
 * The ids of the verbs drawn as header buttons.
 *
 * @param {object} wrapper The page.
 * @return {string[]} The ids.
 */
function buttonVerbs(wrapper) {
	return wrapper.findAll('.cn-detail-page__header-actions > [data-testid^="cn-detail-page-verb-"]').map((b) => b.attributes('data-testid').replace('cn-detail-page-verb-', ''))
}

beforeEach(() => {
	setActivePinia(createPinia())
	mockGet.mockReset()
	mockPost.mockReset()
	mockShowError.mockReset()
	mockShowSuccess.mockReset()
	mockGet.mockResolvedValue({ data: TASK })
})

describe('the tasks source offers verbs from the task state', () => {
	it('offers complete and hand back on a held task, with cancel in the menu', () => {
		const verbs = resolveRecordSource('tasks').verbs(TASK)
		expect(verbs.map((v) => [v.id, v.menu])).toEqual([['complete', false], ['unclaim', false], ['edit', false], ['cancel', true]])
	})

	it('offers pick up on a task nobody holds', () => {
		const verbs = resolveRecordSource('tasks').verbs({ ...TASK, assignee: null })
		expect(verbs.map((v) => v.id)).toEqual(['complete', 'claim', 'edit', 'cancel'])
	})

	it('offers nothing on a finished task', () => {
		for (const state of ['completed', 'terminated', 'disabled']) {
			expect(resolveRecordSource('tasks').verbs({ ...TASK, state })).toEqual([])
		}
	})
})

describe('a detail page on the tasks source', () => {
	it('draws the button verbs in the header and lists cancel in the Actions menu', async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(buttonVerbs(wrapper)).toEqual(['complete', 'unclaim', 'edit'])
		expect(wrapper.vm.headerMenuEntries.map((e) => e.id)).toContain('cn-source-verb-cancel')
	})

	it('posts the verb to the engine and redraws from the task it answers with', async () => {
		mockPost.mockResolvedValue({ status: 200, data: { ...TASK, assignee: null } })
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.find('[data-testid="cn-detail-page-verb-unclaim"]').trigger('click')
		await flushPromises()

		expect(mockPost).toHaveBeenCalledWith(`/index.php/apps/openregister/api/flow-tasks/${UUID}/unclaim`, {})
		expect(buttonVerbs(wrapper)).toEqual(['complete', 'claim', 'edit'])
		expect(wrapper.emitted('transitioned')[0][0]).toMatchObject({ action: 'unclaim' })
	})

	it('posts a verb to the app route the manifest names for it', async () => {
		mockPost.mockResolvedValue({ status: 200, data: { results: { ...TASK, state: 'completed' } } })
		const wrapper = mountPage({ verbEndpoints: { complete: '/apps/dossiq/api/case-tasks/{id}/complete' } })
		await flushPromises()

		await wrapper.find('[data-testid="cn-detail-page-verb-complete"]').trigger('click')
		await flushPromises()

		expect(mockPost.mock.calls[0][0]).toBe(`/index.php/apps/dossiq/api/case-tasks/${UUID}/complete`)
		expect(mockShowSuccess).toHaveBeenCalled()
		expect(buttonVerbs(wrapper)).toEqual([])
	})

	it('shows the engine refusal as-is and keeps the task as it was', async () => {
		mockPost.mockRejectedValue(Object.assign(new Error('409'), { response: { status: 409, data: { error: 'complete refused: the task is held by anouk' } } }))
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.find('[data-testid="cn-detail-page-verb-complete"]').trigger('click')
		await flushPromises()

		expect(mockShowError).toHaveBeenCalledWith('complete refused: the task is held by anouk')
		expect(buttonVerbs(wrapper)).toEqual(['complete', 'unclaim', 'edit'])
		expect(wrapper.emitted('transitioned')).toBeUndefined()
	})

	it('draws no verbs when the task was not found', async () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		mockGet.mockRejectedValue(Object.assign(new Error('404'), { response: { status: 404 } }))
		const wrapper = mountPage()
		await flushPromises()

		expect(buttonVerbs(wrapper)).toEqual([])
		expect(wrapper.find('[data-testid="cn-detail-page-not-found"]').exists()).toBe(true)
		error.mockRestore()
	})
})
