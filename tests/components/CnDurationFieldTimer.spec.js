/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDurationField as a clock: running, typing over it, starting by itself, a norm.
 *
 * @spec openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDurationField from '../../src/components/CnDurationField/CnDurationField.vue'
import { formatClock, parseClock, secondsToDuration } from '../../src/utils/isoDuration.js'

const stubs = {
	NcProgressBar: { name: 'NcProgressBar', props: ['value', 'error'], template: '<div class="bar" />' },
	NcSelect: { name: 'NcSelect', template: '<div class="select" />' },
	NcButton: { name: 'NcButton', props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: {
		name: 'NcTextField',
		props: ['modelValue', 'error', 'helperText', 'label'],
		emits: ['update:modelValue'],
		template: '<input class="clock" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
	},
}

function mountField(props = {}) {
	return mount(CnDurationField, {
		props: { timer: true, inputLabel: 'Duration', ...props },
		global: { stubs },
	})
}

const lastValue = (w) => w.emitted('update:modelValue').at(-1)[0]
const clock = (w) => w.find('input.clock').element.value
const click = (w, id) => w.find(`[data-testid="cn-duration-${id}"]`).trigger('click')

describe('CnDurationField timer', () => {
	beforeEach(() => jest.useFakeTimers())
	afterEach(() => jest.useRealTimers())

	it('writes the running time every second and shows it as a clock', async () => {
		const w = mountField()
		await click(w, 'start')
		jest.advanceTimersByTime(5000)
		await w.vm.$nextTick()
		expect(lastValue(w)).toBe('PT5S')
		expect(clock(w)).toBe('00:05')
		expect(w.find('[data-testid="cn-duration-state"]').text()).toBe('Running')
	})

	it('counts from the start moment when the interval fires late', async () => {
		const w = mountField()
		await click(w, 'start')
		jest.setSystemTime(Date.now() + 90000)
		jest.advanceTimersByTime(1000)
		expect(lastValue(w)).toBe('PT1M31S')
	})

	it('stops with the final time and no longer writes', async () => {
		const w = mountField()
		await click(w, 'start')
		jest.advanceTimersByTime(3000)
		await click(w, 'stop')
		const writes = w.emitted('update:modelValue').length
		expect(w.emitted('stopped')[0]).toEqual(['PT3S'])
		jest.advanceTimersByTime(5000)
		expect(w.emitted('update:modelValue')).toHaveLength(writes)
		expect(w.find('[data-testid="cn-duration-start"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-duration-state"]').text()).toBe('Stopped')
	})

	it('carries on from the time it shows', async () => {
		const w = mountField({ modelValue: 'PT6M' })
		expect(clock(w)).toBe('06:00')
		await click(w, 'start')
		jest.advanceTimersByTime(2000)
		expect(lastValue(w)).toBe('PT6M2S')
	})

	it('ignores the echo of its own writes while running', async () => {
		const w = mountField()
		await click(w, 'start')
		jest.advanceTimersByTime(4000)
		await w.setProps({ modelValue: 'PT2S' })
		jest.advanceTimersByTime(1000)
		expect(lastValue(w)).toBe('PT5S')
	})

	it('resets to null and stops', async () => {
		const w = mountField()
		await click(w, 'start')
		jest.advanceTimersByTime(3000)
		await click(w, 'reset')
		expect(lastValue(w)).toBeNull()
		expect(w.emitted('reset')).toHaveLength(1)
		await w.vm.$nextTick()
		expect(clock(w)).toBe('')
		jest.advanceTimersByTime(3000)
		expect(lastValue(w)).toBeNull()
	})

	it('clears the interval when it unmounts', async () => {
		const w = mountField()
		await click(w, 'start')
		const writes = w.emitted('update:modelValue')
		w.unmount()
		const count = writes ? writes.length : 0
		jest.advanceTimersByTime(3000)
		expect((w.emitted('update:modelValue') || []).length).toBe(count)
	})

	it('stops when the user types a length and keeps what was typed', async () => {
		const w = mountField()
		await click(w, 'start')
		jest.advanceTimersByTime(3000)
		await w.find('input.clock').setValue('04:23')
		expect(lastValue(w)).toBe('PT4M23S')
		jest.advanceTimersByTime(5000)
		expect(lastValue(w)).toBe('PT4M23S')
		expect(clock(w)).toBe('04:23')
	})

	it('shows an error for text that is no length and writes nothing', async () => {
		const w = mountField()
		await w.find('input.clock').setValue('soon')
		expect(w.emitted('update:modelValue')).toBeUndefined()
		const field = w.findComponent({ name: 'NcTextField' })
		expect(field.props('error')).toBe(true)
		expect(field.props('helperText')).toContain('04:23')
	})

	it('drops what was typed when the host changes the value', async () => {
		const w = mountField()
		await w.find('input.clock').setValue('6')
		await w.setProps({ modelValue: 'PT6M' })
		expect(clock(w)).toBe('6')
		await w.setProps({ modelValue: 'PT9M' })
		expect(clock(w)).toBe('09:00')
	})

	it('starts by itself on an empty field only', () => {
		const empty = mountField({ autoStart: true })
		expect(empty.emitted('started')).toHaveLength(1)
		const saved = mountField({ autoStart: true, modelValue: 'PT6M' })
		expect(saved.emitted('started')).toBeUndefined()
		const off = mountField({ autoStart: true, disabled: true })
		expect(off.emitted('started')).toBeUndefined()
	})

	it('starts when autoStart turns true later', async () => {
		const w = mountField()
		expect(w.emitted('started')).toBeUndefined()
		await w.setProps({ autoStart: true })
		expect(w.emitted('started')).toHaveLength(1)
	})

	it('reads the time against a norm', () => {
		const w = mountField({ modelValue: 'PT3M', norm: 'PT5M', normLabel: 'Call time' })
		const norm = w.find('[data-testid="cn-duration-norm"]')
		expect(norm.text()).toContain('Call time 03:00 of 05:00')
		expect(norm.text()).toContain('60%')
		expect(w.find('[data-testid="cn-duration-norm-words"]').exists()).toBe(false)
		expect(norm.classes()).toContain('cn-duration-field__norm--within')
	})

	it('says it in words from the warning percentage and past the norm', () => {
		const near = mountField({ modelValue: 'PT4M', norm: 'PT5M' })
		expect(near.find('[data-testid="cn-duration-norm-words"]').text()).toBe('Close to the norm')
		const low = mountField({ modelValue: 'PT4M', norm: 'PT5M', normWarningPercent: 90 })
		expect(low.find('[data-testid="cn-duration-norm-words"]').exists()).toBe(false)
		const over = mountField({ modelValue: 'PT6M', norm: 'PT5M' })
		expect(over.find('[data-testid="cn-duration-norm-words"]').text()).toBe('Over the norm')
		expect(over.text()).toContain('120%')
		const bar = over.findComponent({ name: 'NcProgressBar' })
		expect(bar.props('value')).toBe(100)
		expect(bar.props('error')).toBe(true)
	})

	it('draws no clock or norm without timer', () => {
		const w = mountField({ timer: false, modelValue: 'P56D', norm: 'PT5M' })
		expect(w.find('[data-testid="cn-duration-start"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-duration-norm"]').exists()).toBe(false)
		expect(w.findComponent({ name: 'NcSelect' }).exists()).toBe(true)
	})
})

describe('isoDuration clock helpers', () => {
	it('writes seconds as canonical ISO', () => {
		expect(secondsToDuration(0)).toBe('PT0S')
		expect(secondsToDuration(360)).toBe('PT6M')
		expect(secondsToDuration(3863)).toBe('PT1H4M23S')
	})

	it('shows seconds as a clock', () => {
		expect(formatClock(263)).toBe('04:23')
		expect(formatClock(3863)).toBe('1:04:23')
	})

	it('reads typed text', () => {
		expect(parseClock('6')).toBe(360)
		expect(parseClock(' 04:23 ')).toBe(263)
		expect(parseClock('1:04:23')).toBe(3863)
		expect(parseClock('4:75')).toBeNull()
		expect(parseClock('soon')).toBeNull()
		expect(parseClock('')).toBeNull()
	})
})
