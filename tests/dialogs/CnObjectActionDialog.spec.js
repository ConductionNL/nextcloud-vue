/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectActionDialog and utils/objectActionInputs: an object action's
 * inputs asked from their JSON Schema, the run, and what the person reads
 * after it. OpenRegister is mocked at the HTTP edge.
 *
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-inputs-are-asked-in-a-dialog-built-from-their-json-schema
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/event-bus', () => ({
	__esModule: true,
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

const axios = require('@nextcloud/axios').default
const { showSuccess } = require('@nextcloud/dialogs')
const { emit } = require('@nextcloud/event-bus')
const CnObjectActionDialog = require('../../src/dialogs/CnObjectActionDialog.vue').default
const { objectActionDefaults, objectActionInputs } = require('../../src/utils/objectActionInputs.js')

const INPUTS = {
	type: 'object',
	required: ['from'],
	properties: {
		from: { type: 'string', format: 'date', title: 'Public from', default: '@now' },
		channel: { type: 'string', title: { nl: 'Kanaal', en: 'Channel' }, enum: ['web', 'gazette'], 'x-enum-labels': { web: 'Website', gazette: 'Staatscourant' } },
		pin: { type: 'string', writeOnly: true },
		owner: { type: 'string', default: '@object.assignee' },
		stamp: { type: 'string', readOnly: true },
	},
}

const PUBLISH = {
	key: 'publish',
	kind: 'steps',
	label: 'Publish',
	description: 'Make the decision public from a date.',
	inputs: INPUTS,
	confirm: 'The decision becomes public.',
	mode: 'sync',
	next: 'stay',
}

/**
 * Mount the dialog for one object.
 *
 * @param {object} action The action.
 * @param {object} [props] Extra props.
 * @return {object} The wrapper.
 */
function mountDialog(action = PUBLISH, props = {}) {
	return mount(CnObjectActionDialog, {
		props: { action, register: 'zaken', schema: 'decision', objectId: 'd-1', currentObject: { assignee: 'jan' }, ...props },
	})
}

/**
 * Type into one input.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} field The input.
 * @param {string} value The value.
 * @return {Promise<void>}
 */
async function type(wrapper, field, value) {
	wrapper.find(`[data-testid="cn-transition-input-${field}"]`).findComponent({ name: 'NcTextField' }).vm.$emit('update:model-value', value)
	await wrapper.vm.$nextTick()
}

beforeEach(() => {
	jest.clearAllMocks()
	axios.get.mockResolvedValue({ data: { status: 'completed', log: [] } })
})

describe('objectActionInputs', () => {
	it('turns the properties into declared inputs in order, leaving read-only ones out', () => {
		expect(objectActionInputs(INPUTS, { language: 'nl' })).toEqual([
			{ field: 'from', required: true, label: 'Public from', widget: 'date' },
			{ field: 'channel', required: false, label: 'Kanaal', options: [{ value: 'web', label: 'Website' }, { value: 'gazette', label: 'Staatscourant' }] },
			{ field: 'pin', required: false, label: 'Pin', widget: 'password' },
			{ field: 'owner', required: false, label: 'Owner' },
		])
	})

	it('reads oneOf choices', () => {
		const inputs = objectActionInputs({ properties: { act: { oneOf: [{ const: 'a', title: 'Approve' }, { const: 'r', title: 'Reject' }] } } })
		expect(inputs[0].options).toEqual([{ value: 'a', label: 'Approve' }, { value: 'r', label: 'Reject' }])
	})

	it('resolves @now, @user and @object defaults', () => {
		const now = new Date(2026, 9, 21, 14, 30)
		const values = objectActionDefaults({
			properties: {
				from: { type: 'string', format: 'date', default: '@now' },
				who: { type: 'string', default: '@user' },
				owner: { type: 'string', default: '@object.assignee' },
				missing: { type: 'string', default: '@object.nope' },
				notify: { type: 'boolean' },
				plain: { type: 'string', default: 'x' },
			},
		}, { object: { assignee: 'jan' }, user: 'piet', now })
		expect(values).toEqual({ from: '2026-10-21', who: 'piet', owner: 'jan', missing: '', notify: false, plain: 'x' })
	})
})

describe('CnObjectActionDialog', () => {
	it('shows the confirm text and the inputs from the JSON Schema', () => {
		const wrapper = mountDialog()
		expect(wrapper.find('[data-testid="cn-object-action-confirm-text"]').text()).toBe('The decision becomes public.')
		expect(wrapper.find('[data-testid="cn-transition-input-from"]').findComponent({ name: 'NcTextField' }).attributes('type')).toBe('date')
		expect(wrapper.find('[data-testid="cn-transition-input-pin"]').findComponent({ name: 'NcTextField' }).attributes('type')).toBe('password')
		expect(wrapper.find('[data-testid="cn-transition-input-stamp"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-object-action-confirm"]').text()).toBe('Publish')
	})

	it('keeps confirm disabled until the required inputs are filled', async () => {
		const wrapper = mountDialog()
		await type(wrapper, 'from', '')
		expect(wrapper.find('[data-testid="cn-object-action-confirm"]').attributes('disabled')).toBeTruthy()
		await type(wrapper, 'from', '2026-11-01')
		expect(wrapper.find('[data-testid="cn-object-action-confirm"]').attributes('disabled')).toBeFalsy()
	})

	it('runs a sync action with the inputs, toasts and closes', async () => {
		axios.post.mockResolvedValue({ status: 200, data: { run: 'r-1', outcome: 'completed' } })
		const wrapper = mountDialog()
		await type(wrapper, 'from', '2026-11-01')
		await wrapper.find('[data-testid="cn-object-action-confirm"]').trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/decision/d-1/actions/publish')
		expect(axios.post.mock.calls[0][1]).toEqual({ inputs: { from: '2026-11-01', owner: 'jan' } })
		expect(wrapper.emitted('done')[0][0]).toMatchObject({ ok: true, status: 'completed' })
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(showSuccess).toHaveBeenCalledWith('Publish: done')
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', expect.any(Object))
	})

	it('stays open on a 422 with the refused input marked and the value kept', async () => {
		axios.post.mockRejectedValue({ response: { status: 422, data: { message: 'Invalid inputs', errors: [{ field: 'from' }] } } })
		const wrapper = mountDialog()
		await type(wrapper, 'from', 'tomorrow-ish')
		await wrapper.find('[data-testid="cn-object-action-confirm"]').trigger('click')
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-object-action-error"]').text()).toBe('Invalid inputs')
		expect(wrapper.find('[data-testid="cn-transition-input-error-from"]').exists()).toBe(true)
		expect(wrapper.vm.values.from).toBe('tomorrow-ish')
		expect(wrapper.emitted('close')).toBeFalsy()
	})

	it('shows the precondition reason', async () => {
		axios.post.mockRejectedValue({ response: { status: 409, data: { error: 'action-precondition-unmet', message: 'Only a decided decision can be published.' } } })
		const wrapper = mountDialog()
		await type(wrapper, 'from', '2026-11-01')
		await wrapper.find('[data-testid="cn-object-action-confirm"]').trigger('click')
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-object-action-error"]').text()).toBe('Only a decided decision can be published.')
	})

	it('follows an async run and shows the result', async () => {
		axios.post.mockResolvedValue({ status: 202, data: { run: 'r-7', status: 'queued' } })
		axios.get.mockResolvedValue({ data: { status: 'completed', log: [{}, {}] } })
		const wrapper = mountDialog({ ...PUBLISH, mode: 'async', inputs: null, confirm: '' })
		await wrapper.find('[data-testid="cn-object-action-confirm"]').trigger('click')
		expect(wrapper.find('[data-testid="cn-object-action-running"]').exists()).toBe(true)
		await flushPromises()
		await new Promise((resolve) => setTimeout(resolve, 0))
		await flushPromises()
		expect(axios.get.mock.calls.some(([url]) => url.includes('/apps/openregister/api/flow-runs/r-7'))).toBe(true)
		expect(wrapper.find('[data-testid="cn-object-action-result"]').text()).toBe('Done')
	})

	it('says a suspended run waits, never that it is done', async () => {
		axios.post.mockResolvedValue({ status: 202, data: { run: 'r-8', status: 'suspended' } })
		const wrapper = mountDialog({ ...PUBLISH, inputs: null, confirm: '' })
		await wrapper.find('[data-testid="cn-object-action-confirm"]').trigger('click')
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-object-action-result"]').text()).toContain('waiting for a next step')
	})

	it('runs on a selection and shows the summary', async () => {
		axios.post.mockResolvedValue({ status: 200, data: { summary: { succeeded: 2, failed: 1 }, results: [] } })
		const wrapper = mountDialog({ ...PUBLISH, inputs: null, confirm: '' }, { objectId: '', ids: ['a', 'b', 'c'] })
		expect(wrapper.find('[data-testid="cn-object-action-selection"]').text()).toBe('Runs on 3 items')
		await wrapper.find('[data-testid="cn-object-action-confirm"]').trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/object-actions/zaken/decision/publish')
		expect(wrapper.find('[data-testid="cn-object-action-result"]').text()).toBe('2 done, 1 failed')
	})

	it('passes on where the person goes next', async () => {
		axios.post.mockResolvedValue({ status: 200, data: { run: 'r-1', outcome: 'completed', next: 'next' } })
		const wrapper = mountDialog({ ...PUBLISH, inputs: null, confirm: '' })
		await wrapper.find('[data-testid="cn-object-action-confirm"]').trigger('click')
		await flushPromises()
		expect(emit).toHaveBeenCalledWith('cn:object-action:next', { action: 'publish', next: 'next', object: { register: 'zaken', schema: 'decision', id: 'd-1' } })
	})
})
