/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * record-notes actions: buttons that send the typed text to an endpoint
 * (board PqTaak "Deze taak afronden": Poging vastleggen, Afronden).
 *
 * @spec openspec/changes/record-notes-actions/specs/record-notes-widget/spec.md#requirement-a-notes-field-can-send-its-text-with-an-action
 */
var mockPatch = jest.fn()
var mockPost = jest.fn()
var mockEmit = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { patch: (...args) => mockPatch(...args), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

jest.mock('@nextcloud/event-bus', () => ({ emit: (...args) => mockEmit(...args), subscribe: jest.fn(), unsubscribe: jest.fn() }))

import { flushPromises, mount } from '@vue/test-utils'
import CnRecordNotesWidget from '../../src/components/CnRecordNotesWidget/CnRecordNotesWidget.vue'

const TASK = { id: 'task-7', resultText: '', '@self': { id: 'task-7', register: 'pipelinq', schema: 'crmTask' } }

const CONTENT = {
	field: 'resultText',
	label: 'Result',
	rows: 2,
	placeholder: 'What came out of the callback?',
	autosave: false,
	debounceMs: 5,
	actions: [
		{ label: 'Log attempt', icon: 'PhoneLog', request: { url: '/apps/pipelinq/api/callbacks/@objectId/attempts', body: { result: '{text}' } }, doneText: 'Attempt logged.' },
		{ label: 'Finish', icon: 'Check', variant: 'primary', request: { url: '/apps/pipelinq/api/callbacks/@objectId/complete', body: { resultText: '{text}' } }, doneText: 'Task finished.' },
	],
}

function mountCard(content = CONTENT) {
	return mount(CnRecordNotesWidget, {
		props: { objectData: TASK, content },
		global: { stubs: { CnIcon: true } },
	})
}

const buttons = (w) => w.findAll('[data-testid="cn-record-notes-action"]')

describe('CnRecordNotesWidget actions', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		mockPatch.mockReset()
		mockPost.mockReset()
		mockEmit.mockReset()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('draws the actions, disabled until there is text, and writes nothing while typing', async () => {
		const w = mountCard()
		expect(buttons(w).map((b) => b.text())).toEqual(['Log attempt', 'Finish'])
		expect(buttons(w)[0].attributes('disabled')).toBeDefined()
		await w.find('textarea').setValue('Afvalpas opnieuw aangemeld')
		jest.advanceTimersByTime(50)
		await flushPromises()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(buttons(w)[1].attributes('disabled')).toBeUndefined()
	})

	it('sends the text to the action endpoint, clears it, says so and refreshes the page', async () => {
		mockPost.mockResolvedValue({ data: { task: { status: 'completed' } } })
		const w = mountCard()
		await w.find('textarea').setValue('Afvalpas opnieuw aangemeld')
		await buttons(w)[1].trigger('click')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/callbacks/task-7/complete', { resultText: 'Afvalpas opnieuw aangemeld' })
		expect(w.find('textarea').element.value).toBe('')
		expect(w.find('[data-testid="cn-record-notes-status"]').text()).toBe('Task finished.')
		expect(mockEmit).toHaveBeenCalledWith('cn:page:refresh', {})
	})

	it('shows a refusal in the server\'s words and keeps the text', async () => {
		mockPost.mockRejectedValue({ response: { data: { error: 'You are not assigned to this task' } } })
		const w = mountCard()
		await w.find('textarea').setValue('Geen gehoor')
		await buttons(w)[0].trigger('click')
		await flushPromises()
		expect(mockPost.mock.calls[0]).toEqual(['/index.php/apps/pipelinq/api/callbacks/task-7/attempts', { result: 'Geen gehoor' }])
		expect(w.find('[data-testid="cn-record-notes-status"]').text()).toBe('You are not assigned to this task')
		expect(w.find('textarea').element.value).toBe('Geen gehoor')
		expect(mockEmit).not.toHaveBeenCalled()
	})

	it('shows an action only while its visibleWhen holds on the record', async () => {
		const actions = [CONTENT.actions[0], { ...CONTENT.actions[1], visibleWhen: { field: 'status', op: 'eq', value: 'in_progress' } }]
		const open = mount(CnRecordNotesWidget, { props: { objectData: { ...TASK, status: 'open' }, content: { ...CONTENT, actions } }, global: { stubs: { CnIcon: true } } })
		expect(buttons(open).map((b) => b.text())).toEqual(['Log attempt'])
		const busy = mount(CnRecordNotesWidget, { props: { objectData: { ...TASK, status: 'in_progress' }, content: { ...CONTENT, actions } }, global: { stubs: { CnIcon: true } } })
		expect(buttons(busy).map((b) => b.text())).toEqual(['Log attempt', 'Finish'])
	})

	it('keeps saving as you type without autosave false', async () => {
		mockPatch.mockResolvedValue({ data: {} })
		const w = mountCard({ ...CONTENT, autosave: undefined })
		await w.find('textarea').setValue('Kladje')
		jest.advanceTimersByTime(50)
		await flushPromises()
		expect(mockPatch).toHaveBeenCalled()
	})
})
