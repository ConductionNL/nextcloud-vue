/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The declared inputs of an act: choices read off the context, an "Other"
 * entry that falls back to free text, a helper read off the picked choice,
 * a preview that only shows once it can be worked out, and a template that
 * never writes over typed text.
 */

import {
	applyTemplateText,
	fillInputTemplate,
	initialInputValues,
	inputFieldsComplete,
	OTHER_OPTION_VALUE,
	readTransitionInputs,
	resolveInputFields,
	submittedValue,
} from '../../src/utils/transitionInputs.js'

const REASONS = [
	{ key: 'consent', name: 'Waiting for consent', legalBasis: 'Awb 4:5' },
]

const PAUSE = [
	{ field: 'pauseReason', optionsSource: 'pauseReasons', optionValue: 'key', optionLabel: 'name', required: true, other: { label: 'Other', input: 'reason' } },
	{ field: 'reason', widget: 'text', required: true },
	{ field: 'days', widget: 'number', default: '14', helperFrom: { input: 'pauseReason', key: 'legalBasis' }, preview: { label: 'Comes back on', template: '{today+days|date}' } },
]

/**
 * Resolve the pause inputs.
 *
 * @param {Array<object>} reasons The declared reasons.
 * @param {object} values The values.
 * @return {object} The fields by key.
 */
function pause(reasons, values) {
	const fields = resolveInputFields(PAUSE, { context: { pauseReasons: reasons }, values, now: new Date(2026, 0, 10) })
	return { fields, byKey: Object.fromEntries(fields.map((field) => [field.key, field])) }
}

describe('choices read off the context, with Other', () => {
	it('offers the rows, then Other, and hides the free text until Other is picked', () => {
		const { byKey } = pause(REASONS, { pauseReason: 'consent' })
		expect(byKey.pauseReason.hidden).toBe(false)
		expect(byKey.pauseReason.options).toEqual([
			{ value: 'consent', label: 'Waiting for consent' },
			{ value: OTHER_OPTION_VALUE, label: 'Other' },
		])
		expect(byKey.reason.hidden).toBe(true)
		expect(pause(REASONS, { pauseReason: OTHER_OPTION_VALUE }).byKey.reason.hidden).toBe(false)
	})

	it('hides the picker without rows and keeps the free text', () => {
		const { byKey } = pause([], {})
		expect(byKey.pauseReason.hidden).toBe(true)
		expect(byKey.reason.hidden).toBe(false)
	})

	it('waits for a pick, counts Other as one, then needs the text', () => {
		expect(inputFieldsComplete(pause(REASONS, { pauseReason: '' }).fields, { pauseReason: '' })).toBe(false)
		expect(inputFieldsComplete(pause(REASONS, { pauseReason: 'consent' }).fields, { pauseReason: 'consent', reason: '' })).toBe(true)
		const other = { pauseReason: OTHER_OPTION_VALUE, reason: ' ' }
		expect(inputFieldsComplete(pause(REASONS, other).fields, other)).toBe(false)
		const typed = { pauseReason: OTHER_OPTION_VALUE, reason: 'Something else' }
		expect(inputFieldsComplete(pause(REASONS, typed).fields, typed)).toBe(true)
	})

	it('control: without rows the picker asks nothing and the text is required', () => {
		expect(inputFieldsComplete(pause([], {}).fields, { reason: '' })).toBe(false)
		expect(inputFieldsComplete(pause([], {}).fields, { reason: 'Asked for more' })).toBe(true)
	})

	it('sends Other as nothing and a picked key as itself', () => {
		expect(submittedValue(OTHER_OPTION_VALUE)).toBe('')
		expect(submittedValue('consent')).toBe('consent')
	})
})

describe('a helper read off the picked choice', () => {
	it('shows the picked row\'s legal basis, and nothing before a pick', () => {
		expect(pause(REASONS, { pauseReason: 'consent' }).byKey.days.description).toBe('Awb 4:5')
		expect(pause(REASONS, { pauseReason: '' }).byKey.days.description).toBe('')
	})
})

describe('a preview filled from the values', () => {
	const now = new Date(2026, 0, 10)

	it('says the day, today plus the days given', () => {
		const expected = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(2026, 0, 24))
		expect(fillInputTemplate('{today+days|date}', { days: '14' }, now)).toBe(expected)
		expect(pause(REASONS, { days: '14' }).byKey.days.previewText).toBe(expected)
	})

	it('says nothing without a positive number of days', () => {
		expect(fillInputTemplate('{today+days|date}', { days: '' }, now)).toBe('')
		expect(fillInputTemplate('{today+days|date}', { days: '0' }, now)).toBe('')
		expect(fillInputTemplate('Back on {today+days|date}', { days: 'x' }, now)).toBe('')
	})

	it('fills a plain field token', () => {
		expect(fillInputTemplate('Until {until}', { until: '2026-02-01' }, now)).toBe('Until 2026-02-01')
	})
})

describe('declared widgets and defaults', () => {
	it('draws a declared widget whatever the schema says, and starts from a declared default', () => {
		const fields = resolveInputFields([
			{ field: 'until', widget: 'date', label: 'Comes back on' },
			{ field: 'reason', widget: 'textarea' },
		], { schema: { properties: { until: { type: 'string', title: 'Until' } } } })
		expect(fields.map((field) => [field.key, field.widget, field.label])).toEqual([
			['until', 'date', 'Comes back on'],
			['reason', 'textarea', 'reason'],
		])
		expect(initialInputValues(PAUSE)).toEqual({ pauseReason: '', reason: '', days: '14' })
	})

	it('never asks a template, which fills another input', () => {
		const fields = resolveInputFields([{ field: 'template', widget: 'template', applyTo: 'reason', required: true }])
		expect(inputFieldsComplete(fields, {})).toBe(true)
	})
})

describe('a template never writes over typed text', () => {
	it('fills an empty input from the body, else from presets.body', () => {
		expect(applyTemplateText({ reason: '' }, 'reason', { body: 'Granted.' })).toEqual({ reason: 'Granted.' })
		expect(applyTemplateText({ reason: '' }, 'reason', { presets: { body: 'Refused.' } })).toEqual({ reason: 'Refused.' })
	})

	it('keeps what was typed, and changes nothing without text', () => {
		const typed = { reason: 'Two paragraphs of my own.' }
		expect(applyTemplateText(typed, 'reason', { body: 'Granted.' })).toBe(typed)
		const empty = { reason: '' }
		expect(applyTemplateText(empty, 'reason', { body: '', presets: {} })).toBe(empty)
		expect(applyTemplateText(empty, 'reason', null)).toBe(empty)
	})
})

describe('reading a host\'s values', () => {
	it('says whether the form is complete and sends only what is asked', () => {
		const context = { pauseReasons: REASONS }
		const picked = readTransitionInputs(PAUSE, { pauseReason: 'consent', reason: 'stale', days: '14' }, { context })
		expect(picked).toEqual({ complete: true, data: { pauseReason: 'consent', days: 14 } })

		const other = readTransitionInputs(PAUSE, { pauseReason: OTHER_OPTION_VALUE, reason: '', days: '' }, { context })
		expect(other).toEqual({ complete: false, data: { pauseReason: '', reason: '', days: '' } })
	})
})
