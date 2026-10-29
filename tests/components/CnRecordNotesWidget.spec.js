/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * record-notes: a text field of the record in view, saved as you type, and an
 * outcome select saved with its own button (PqContactmoment: Gespreksnotities
 * and "Uitkomst noteren"). A write PATCHes only the edited key.
 *
 * @spec openspec/changes/record-notes-widget/specs/record-notes-widget/spec.md#requirement-a-text-field-saves-as-you-type
 * @spec openspec/changes/record-notes-widget/specs/record-notes-widget/spec.md#requirement-an-outcome-is-saved-with-its-own-button
 * @spec openspec/changes/record-notes-outcome-below/specs/record-notes-outcome-below/spec.md#requirement-a-notes-field-can-put-its-outcome-under-the-save-status
 */
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { patch: (...args) => mockPatch(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { flushPromises, mount } from '@vue/test-utils'
import CnRecordNotesWidget from '../../src/components/CnRecordNotesWidget/CnRecordNotesWidget.vue'

const RECORD = { id: 't-1', notes: 'Belde over zijn afvalpas.', outcome: '', '@self': { id: 't-1', register: 'pipelinq', schema: 'ticket' } }

const CONTENT = {
	field: 'notes',
	label: 'Conversation notes',
	savedText: 'Saved automatically as you type. Last saved {time}.',
	debounceMs: 10,
	outcome: {
		field: 'outcome',
		label: 'Outcome',
		placeholder: 'Outcome: choose',
		saveLabel: 'Note the outcome',
		options: [{ value: 'handled', label: 'Answered directly' }, { value: 'callbackRequest', label: 'Callback arranged' }],
	},
}

/**
 * @param {object} record The record.
 * @return {object} Wrapper.
 */
function mountNotes(record = RECORD) {
	return mount(CnRecordNotesWidget, {
		props: { objectData: record, content: CONTENT },
		global: { provide: { cnTranslate: (key) => key } },
	})
}

describe('CnRecordNotesWidget', () => {
	beforeEach(() => {
		mockPatch.mockReset()
		mockPatch.mockResolvedValue({ data: {} })
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('keeps the label for screen readers but hides it from view with hideLabel, under a section heading that says the same', () => {
		const shown = mountNotes().find('.cn-record-notes__label')
		expect(shown.classes()).not.toContain('hidden-visually')
		const w = mount(CnRecordNotesWidget, {
			props: { objectData: RECORD, content: { ...CONTENT, hideLabel: true } },
			global: { provide: { cnTranslate: (key) => key } },
		})
		const label = w.find('.cn-record-notes__label')
		expect(label.text()).toBe('Conversation notes')
		expect(label.attributes('for')).toBe(w.find('[data-testid="cn-record-notes-text"]').attributes('id'))
		expect(label.classes()).toContain('hidden-visually')
	})

	it('puts the outcome on its own line under the save status with outcomeBelow', () => {
		const wrapper = mount(CnRecordNotesWidget, {
			props: { objectData: RECORD, content: { ...CONTENT, outcomeBelow: true } },
			global: { provide: { cnTranslate: (key) => key } },
		})
		expect(wrapper.find('.cn-record-notes__foot').classes()).toContain('cn-record-notes__foot--below')
		expect(mountNotes().find('.cn-record-notes__foot').classes()).not.toContain('cn-record-notes__foot--below')
	})

	it('shows the record\'s notes and its outcome options', () => {
		const w = mountNotes()
		expect(w.find('[data-testid="cn-record-notes-text"]').element.value).toBe('Belde over zijn afvalpas.')
		expect(w.findAll('[data-testid="cn-record-notes-outcome"] option').map((o) => o.text())).toEqual(['Outcome: choose', 'Answered directly', 'Callback arranged'])
		expect(w.find('[data-testid="cn-record-notes-status"]').text()).toBe('Saved automatically as you type.')
	})

	it('saves the notes a moment after typing, only that key', async () => {
		const w = mountNotes()
		const area = w.find('[data-testid="cn-record-notes-text"]')
		await area.setValue('Pas wordt vervangen.')
		expect(mockPatch).not.toHaveBeenCalled()
		jest.advanceTimersByTime(20)
		await flushPromises()
		expect(mockPatch).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/pipelinq/ticket/t-1', { notes: 'Pas wordt vervangen.' })
		expect(w.find('[data-testid="cn-record-notes-status"]').text()).toMatch(/^Saved automatically as you type\. Last saved \d{2}:\d{2}\.$/)
	})

	it('saves the outcome with its button, not before', async () => {
		const w = mountNotes()
		const button = w.find('[data-testid="cn-record-notes-outcome-save"]')
		expect(button.attributes('disabled')).toBeDefined()
		await w.find('[data-testid="cn-record-notes-outcome"]').setValue('callbackRequest')
		expect(mockPatch).not.toHaveBeenCalled()
		await w.find('[data-testid="cn-record-notes-outcome-save"]').trigger('click')
		await flushPromises()
		expect(mockPatch).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/pipelinq/ticket/t-1', { outcome: 'callbackRequest' })
	})

	it('is read-only without a register and schema to save to', () => {
		const w = mountNotes({ id: 't-2', notes: 'x' })
		expect(w.find('[data-testid="cn-record-notes-text"]').attributes('disabled')).toBeDefined()
	})

	it('says so when a save fails, and keeps the text', async () => {
		mockPatch.mockRejectedValue(new Error('500'))
		const w = mountNotes()
		await w.find('[data-testid="cn-record-notes-text"]').setValue('Nieuw')
		jest.advanceTimersByTime(20)
		await flushPromises()
		expect(w.find('[data-testid="cn-record-notes-status"]').text()).toContain('Could not save')
		expect(w.find('[data-testid="cn-record-notes-text"]').element.value).toBe('Nieuw')
	})
})
