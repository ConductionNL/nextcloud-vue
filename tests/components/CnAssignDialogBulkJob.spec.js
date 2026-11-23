/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAssignDialog with a selection: the bulk band's "Assign to" (board
 * PqTicketsSelectie "Toewijzen aan") starts OpenRegister's assign job.
 *
 * @spec openspec/changes/assign-dialog-bulk-job/specs/assign-dialog/spec.md#requirement-an-assign-dialog-can-hand-a-selection-over-as-a-bulk-job
 */
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnAssignDialog from '../../src/components/CnAssignDialog/CnAssignDialog.vue'
import { searchNextcloudGroups, searchNextcloudUsers } from '../../src/utils/userAutocomplete.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('../../src/utils/userAutocomplete.js', () => ({ searchNextcloudGroups: jest.fn(), searchNextcloudUsers: jest.fn() }))

const ASSIGN = {
	title: 'Assign the selected tickets',
	assignee: { kinds: ['user'], label: 'Handler', field: 'assignee' },
	note: { label: 'Why they move' },
	confirm: { label: 'Assign' },
	bulkJob: { register: 'pipelinq', schema: 'ticket' },
}

const SearchSelect = {
	name: 'CnSearchSelect',
	props: ['modelValue', 'options', 'inputLabel', 'labelOutside', 'loading', 'placeholder'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="ss" />',
}

const Progress = {
	name: 'CnBulkJobProgress',
	props: ['job'],
	emits: ['update:job', 'finished'],
	template: '<div class="progress" :data-state="job.state" />',
}

/**
 * Mount the dialog with three selected tickets, pick a handler and write why.
 *
 * @param {object} config The config.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The dialog.
 */
async function pickedDialog(config = ASSIGN) {
	const w = mount(CnAssignDialog, {
		props: { config, selectedIds: ['t-1', 't-2', 't-3'], count: 3 },
		global: {
			stubs: {
				CnSearchSelect: SearchSelect,
				CnBulkJobProgress: Progress,
				CnDialog: { name: 'CnDialog', props: ['name'], template: '<div class="dialog"><slot /><slot name="actions" /></div>' },
				NcTextArea: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
				CnIcon: true,
			},
		},
	})
	await flushPromises()
	w.findComponent(SearchSelect).vm.$emit('search', 'Fat')
	jest.advanceTimersByTime(300)
	await flushPromises()
	w.findComponent(SearchSelect).vm.$emit('update:modelValue', 'fatma')
	await w.find('textarea').setValue('Fatma has the Kerkplein work this week')
	return w
}

describe('CnAssignDialog bulk job', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		axios.get.mockReset()
		axios.post.mockReset()
		emit.mockReset()
		searchNextcloudGroups.mockResolvedValue([])
		searchNextcloudUsers.mockResolvedValue([{ id: 'fatma', label: 'Fatma Yildiz', subline: '' }])
		axios.get.mockImplementation(async (url) => ({ data: { id: url.includes('/registers/') ? 4 : 21 } }))
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('starts OpenRegister\'s assign job over the selection and shows the rehearsal', async () => {
		axios.post.mockResolvedValue({ data: { id: 9, state: 'previewed', total: 3 } })
		const w = await pickedDialog()
		await w.find('[data-testid="cn-assign-dialog-confirm"]').trigger('click')
		await flushPromises()

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/registers/pipelinq')
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/schemas/ticket?register=pipelinq')
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/bulk-jobs', {
			action: 'openregister:assign',
			parameters: { property: 'assignee', value: 'fatma' },
			selection: { ids: ['t-1', 't-2', 't-3'] },
			justification: 'Fatma has the Kerkplein work this week',
			register: 4,
			schema: 21,
		})
		expect(w.find('.progress').attributes('data-state')).toBe('previewed')
		expect(w.find('[data-testid="cn-assign-dialog-confirm"]').exists()).toBe(false)
		expect(emit).not.toHaveBeenCalled()

		w.findComponent(Progress).vm.$emit('finished', { id: 9, state: 'completed' })
		await flushPromises()
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
		expect(w.emitted('done')).toHaveLength(1)
	})

	it('takes numeric ids as they are and the property from bulkJob', async () => {
		axios.post.mockResolvedValue({ data: { id: 10, state: 'previewed' } })
		const w = await pickedDialog({ ...ASSIGN, bulkJob: { register: 4, schema: '21', property: 'handler' } })
		await w.find('[data-testid="cn-assign-dialog-confirm"]').trigger('click')
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
		expect(axios.post.mock.calls[0][1]).toMatchObject({ parameters: { property: 'handler', value: 'fatma' }, register: 4, schema: 21 })
	})

	it('shows a refusal of the whole job and stays on the form', async () => {
		axios.post.mockRejectedValue({ response: { status: 422, data: { error: 'The selection is larger than this instance allows.' } } })
		const w = await pickedDialog()
		await w.find('[data-testid="cn-assign-dialog-confirm"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-assign-dialog-refusal"]').text()).toBe('The selection is larger than this instance allows.')
		expect(w.find('.progress').exists()).toBe(false)
		expect(w.find('[data-testid="cn-assign-dialog-confirm"]').exists()).toBe(true)
	})
})
