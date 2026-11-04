/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `create-form` widget logs a dated number against the record of the page,
 * with or without a timer (board DqZaak "Uren registreren").
 *
 * @spec openspec/changes/create-form-date-number-timer/specs/create-form-date-number-timer/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockStore = {
	registerObjectType: jest.fn(),
	saveObject: jest.fn(() => Promise.resolve({ id: 'entry-1' })),
}

jest.mock('../../src/store/index.js', () => ({ __esModule: true, useObjectStore: () => mockStore }))

import CnCreateFormWidget from '../../src/components/CnCreateFormWidget/CnCreateFormWidget.vue'

const CONTENT = {
	register: 'app',
	schema: 'entry',
	fields: [
		{ key: 'date', label: 'Date', type: 'date' },
		{ key: 'hours', label: 'Hours', type: 'number', required: true, step: '0.25' },
	],
	values: { case: '@objectId', team: '@object.team' },
	timer: { field: 'hours', startLabel: 'Start' },
}

const stubs = {
	NcTextField: {
		name: 'NcTextField',
		props: ['modelValue', 'type', 'label', 'step'],
		emits: ['update:modelValue'],
		template: '<input class="field" :type="type" :aria-label="label">',
	},
	NcButton: { name: 'NcButton', props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	CnIcon: true,
	CnResourceSelect: true,
}

function mountWidget(content = CONTENT, props = {}) {
	return mount(CnCreateFormWidget, { props: { content, ...props }, global: { stubs } })
}

function field(w, key) {
	return w.find(`[data-testid="cn-create-form-input-${key}"]`)
}

describe('date and number fields', () => {
	beforeEach(() => mockStore.saveObject.mockClear())

	it('draws inputs of their type', () => {
		const w = mountWidget()
		expect(field(w, 'date').attributes('type')).toBe('date')
		expect(field(w, 'hours').attributes('type')).toBe('number')
	})

	it('holds the submit while a required number is empty and writes a number', async () => {
		const w = mountWidget(CONTENT, { objectId: 'c-1', objectData: { team: 'Roads' } })
		const submit = w.find('[data-testid="cn-create-form-submit"]')
		expect(submit.attributes('disabled')).toBeDefined()
		w.findAllComponents({ name: 'NcTextField' })[1].vm.$emit('update:modelValue', '2.5')
		await flushPromises()
		expect(submit.attributes('disabled')).toBeUndefined()
		await submit.trigger('click')
		await flushPromises()
		const payload = mockStore.saveObject.mock.calls[0][1]
		expect(payload.hours).toBe(2.5)
		expect(payload.case).toBe('c-1')
		expect(payload.team).toBe('Roads')
	})
})

describe('the timer', () => {
	beforeEach(() => {
		mockStore.saveObject.mockClear()
		jest.useFakeTimers()
	})

	afterEach(() => jest.useRealTimers())

	it('counts while it runs and fills the field in hours on stop, saving nothing', async () => {
		const w = mountWidget()
		const timer = w.find('[data-testid="cn-create-form-timer"]')
		expect(timer.text()).toBe('Start')
		await timer.trigger('click')
		expect(timer.text()).toBe('Stop timer')
		jest.advanceTimersByTime(90 * 60 * 1000)
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-create-form-elapsed"]').text()).toBe('1:30:00')
		await timer.trigger('click')
		expect(w.find('[data-testid="cn-create-form-elapsed"]').exists()).toBe(false)
		expect(w.findAllComponents({ name: 'NcTextField' })[1].props('modelValue')).toBe('1.5')
		expect(mockStore.saveObject).not.toHaveBeenCalled()
	})

	it('writes whole minutes with that unit and never reads as nothing', async () => {
		const w = mountWidget({ ...CONTENT, timer: { field: 'hours', unit: 'minutes' } })
		const timer = w.find('[data-testid="cn-create-form-timer"]')
		await timer.trigger('click')
		jest.advanceTimersByTime(3000)
		await timer.trigger('click')
		expect(w.findAllComponents({ name: 'NcTextField' })[1].props('modelValue')).toBe('1')
	})

	it('draws nothing when the timer names no field of the form', () => {
		const w = mountWidget({ ...CONTENT, timer: { field: 'other' } })
		expect(w.find('[data-testid="cn-create-form-timer"]').exists()).toBe(false)
	})

	it('stops counting when the widget goes away', async () => {
		const w = mountWidget()
		await w.find('[data-testid="cn-create-form-timer"]').trigger('click')
		const running = jest.getTimerCount()
		expect(running).toBeGreaterThan(0)
		w.unmount()
		expect(jest.getTimerCount()).toBeLessThan(running)
	})
})
