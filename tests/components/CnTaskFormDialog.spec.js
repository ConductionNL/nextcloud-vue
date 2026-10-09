/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/flow-task-form-component/tasks.md#task-1
 * @spec openspec/changes/flow-task-form-component/tasks.md#task-2
 * @spec openspec/changes/flow-task-form-component/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnTaskFormDialog from '../../src/components/CnTaskFormDialog/CnTaskFormDialog.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const SCHEMA = { properties: { decisionNote: { type: 'string' }, startDate: { type: 'string' }, other: { type: 'string' } } }

function task(form, extra = {}) {
	return { uuid: 'task-1', title: 'Approve permit', registerId: 4, schemaId: 12, objectUuid: 'obj-1', form, ...extra }
}

function ready(fields) {
	return { kind: 'fields', state: 'ready', error: null, schema: { id: 12 }, fields }
}

const FIELDS = [
	{ field: 'startDate', required: false, order: 1, renderable: true, reason: null },
	{ field: 'decisionNote', required: true, order: 0, renderable: true, reason: null },
]

const FormDialogStub = {
	name: 'CnFormDialog',
	props: ['schema', 'fields', 'item', 'includeFields', 'fieldOverrides', 'confirmDisabled'],
	methods: { setResult: jest.fn(), setValidationErrors: jest.fn() },
	template: '<div class="form-dialog"><slot name="before-fields" /><slot name="after-fields" /></div>',
}

async function mountDialog(propsData) {
	axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/schemas/') ? SCHEMA : { id: 'obj-1' } }))
	const w = shallowMount(CnTaskFormDialog, {
		propsData,
		stubs: {
			CnFormDialog: FormDialogStub,
			NcDialog: { template: '<div class="nc-dialog"><slot /><slot name="actions" /></div>' },
			NcNoteCard: { template: '<div class="note"><slot /></div>' },
			NcButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
			NcTextField: { props: ['label', 'helperText', 'disabled'], template: '<div class="field" :data-label="label" :data-disabled="disabled">{{ helperText }}</div>' },
		},
	})
	await new Promise((resolve) => setTimeout(resolve, 0))
	return w
}

describe('CnTaskFormDialog form', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		FormDialogStub.methods.setResult.mockClear()
		FormDialogStub.methods.setValidationErrors.mockClear()
	})

	it('fetches the task when only a uuid is given', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('flow-tasks') ? task(ready(FIELDS)) : SCHEMA }))
		const w = shallowMount(CnTaskFormDialog, { propsData: { taskUuid: 'task-1' }, stubs: { CnFormDialog: FormDialogStub } })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(axios.get.mock.calls[0][0]).toContain('/flow-tasks/task-1')
		expect(w.findComponent(FormDialogStub).exists()).toBe(true)
	})

	it('scopes the form to the declared fields and carries required and order', async () => {
		const w = await mountDialog({ task: task(ready(FIELDS)) })
		const form = w.findComponent(FormDialogStub)
		expect(form.props('includeFields')).toEqual(['decisionNote', 'startDate'])
		expect(form.props('fieldOverrides')).toEqual({
			startDate: { required: false, order: 1 },
			decisionNote: { required: true, order: 0 },
		})
		expect(form.props('confirmDisabled')).toBe(false)
	})

	it('renders a comment field only when the task has no form', async () => {
		const w = await mountDialog({ task: task(null) })
		const form = w.findComponent(FormDialogStub)
		expect(form.props('fields')).toEqual([])
		expect(w.find('.field').attributes('data-label')).toBe('Comment (optional)')
	})

	it('shows a disabled row with the reason for a broken optional field and keeps Confirm enabled', async () => {
		const fields = [...FIELDS, { field: 'riskScore', required: false, order: 2, renderable: false, reason: 'The schema no longer has this field.' }]
		const w = await mountDialog({ task: task({ ...ready(fields), state: 'broken' }) })
		const rows = w.findAll('[data-testid="cn-task-form-broken-row"] .field')
		expect(rows).toHaveLength(1)
		expect(rows.at(0).attributes('data-disabled')).toBe('true')
		expect(rows.at(0).text()).toBe('The schema no longer has this field.')
		expect(w.findComponent(FormDialogStub).props('confirmDisabled')).toBe(false)
	})

	it('disables Confirm and says who fixes it when a broken field is required', async () => {
		const fields = [{ field: 'decisionNote', required: true, order: 0, renderable: false, reason: 'The schema no longer has this field.' }]
		const w = await mountDialog({ task: task({ ...ready(fields), state: 'broken' }) })
		expect(w.findComponent(FormDialogStub).props('confirmDisabled')).toBe(true)
		expect(w.find('[data-testid="cn-task-form-broken-row"] .field').text()).toContain('Ask the person who set up this step to fix it.')
	})

	it('shows the error and no form for an unresolvable form, Confirm disabled', async () => {
		const w = await mountDialog({ task: task({ kind: 'fields', state: 'unresolvable', error: 'Flow X version 3 has no form.', fields: [] }) })
		expect(w.findComponent(FormDialogStub).exists()).toBe(false)
		expect(w.find('[data-testid="cn-task-form-error"]').text()).toBe('Flow X version 3 has no form.')
		const buttons = w.findAll('button')
		expect(buttons.at(buttons.length - 1).attributes('disabled')).toBeDefined()
	})

	it('shows the error for an unavailable external form', async () => {
		const w = await mountDialog({ task: task({ kind: 'external', state: 'unavailable', error: 'Forms is not installed.' }) })
		expect(w.find('[data-testid="cn-task-form-error"]').text()).toBe('Forms is not installed.')
	})
})

describe('CnTaskFormDialog completion', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		FormDialogStub.methods.setResult.mockClear()
		FormDialogStub.methods.setValidationErrors.mockClear()
	})

	it('posts outcome, comment and only the rendered fields, then emits completed', async () => {
		axios.post.mockResolvedValue({ data: { uuid: 'task-1', status: 'done' } })
		const w = await mountDialog({ task: task(ready(FIELDS)), outcome: 'approved' })
		w.vm.comment = 'looks fine'
		w.findComponent(FormDialogStub).vm.$emit('confirm', { id: 'obj-1', decisionNote: 'ok', startDate: '2026-01-01', other: 'x' })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(axios.post).toHaveBeenCalledTimes(1)
		const [url, body] = axios.post.mock.calls[0]
		expect(url).toContain('/flow-tasks/task-1/complete')
		expect(body).toEqual({ outcome: 'approved', comment: 'looks fine', data: { decisionNote: 'ok', startDate: '2026-01-01' } })
		expect(w.emitted('completed')[0][0]).toEqual({ uuid: 'task-1', status: 'done' })
		expect(FormDialogStub.methods.setResult).toHaveBeenCalledWith({ success: true })
	})

	it('marks an empty named field as required, a filled one as refused, and names an unoffered field at the top', async () => {
		axios.post.mockRejectedValue({ response: { status: 400, data: { error: 'Refused.', fields: ['decisionNote', 'startDate', 'legacyFlag'], kind: 'missing' } } })
		const w = await mountDialog({ task: task(ready(FIELDS)) })
		w.findComponent(FormDialogStub).vm.$emit('confirm', { decisionNote: '', startDate: '2026-01-01' })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(w.emitted('completed')).toBeUndefined()
		const [fieldErrors, message] = FormDialogStub.methods.setValidationErrors.mock.calls[0]
		expect(fieldErrors).toEqual({
			decisionNote: 'This field is required.',
			startDate: 'The server refused this value.',
		})
		expect(message).toContain('legacyFlag')
	})

	it('shows only the error at the top for a checklist refusal', async () => {
		axios.post.mockRejectedValue({ response: { status: 400, data: { error: 'Tick the checklist.', fields: [], kind: 'checklist' } } })
		const w = await mountDialog({ task: task(ready(FIELDS)) })
		w.findComponent(FormDialogStub).vm.$emit('confirm', { decisionNote: 'ok' })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(FormDialogStub.methods.setValidationErrors).toHaveBeenCalledWith({}, 'Tick the checklist.')
	})

	it('emits confirm and sends nothing when submit is false, and honours setResult', async () => {
		const w = await mountDialog({ task: task(ready(FIELDS)), submit: false })
		w.findComponent(FormDialogStub).vm.$emit('confirm', { decisionNote: 'ok' })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(axios.post).not.toHaveBeenCalled()
		expect(w.emitted('confirm')[0][0]).toEqual({ outcome: 'done', comment: '', data: { decisionNote: 'ok' } })
		w.vm.setResult({ error: 'nope' })
		expect(FormDialogStub.methods.setResult).toHaveBeenCalledWith({ error: 'nope' })
	})
})
