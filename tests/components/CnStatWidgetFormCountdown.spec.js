/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidgetForm: the countdown display mode.
 *
 * The form must be able to configure a deadline tile, and it must round-trip
 * the `countdown` keys it does not draw. That is not a hypothetical: the same
 * defect was already found and fixed twice in this file, once for an override's
 * icon and once for a clause of the `when` grammar. `countdown` is an OWNED
 * key, so the passthrough that rescues unknown CONTENT keys does not cover its
 * insides, and whatever the assembler leaves out is gone for good.
 */
import { shallowMount } from '@vue/test-utils'
import CnStatWidgetForm from '../../src/components/CnStatWidgetForm/CnStatWidgetForm.vue'

/**
 * Mount the form on a stored content blob.
 *
 * @param {object|null} content The stored content, or null for create mode.
 * @return {object} The wrapper.
 */
function mountForm(content) {
	return shallowMount(CnStatWidgetForm, {
		props: content ? { editingWidget: { content } } : {},
	})
}

/**
 * The last content blob the form emitted.
 *
 * @param {object} wrapper The mounted form.
 * @return {object} The emitted content.
 */
function lastEmit(wrapper) {
	return wrapper.emitted('update:content').at(-1)[0]
}

const dossiqDeadline = {
	label: 'Deadline',
	icon: 'CalendarClock',
	iconColor: '',
	valueColor: '',
	caption: '',
	format: { style: 'number', currency: 'EUR', decimals: 0 },
	display: 'countdown',
	objectField: 'dueDate',
	// THE FIXTURE CARRIES `unit`, `futureLabel`, `todayLabel` AND `emptyText`
	// ON PURPOSE: the form draws none of the four, so they are exactly what a
	// narrowing assembler would delete on save.
	countdown: {
		unit: 'days',
		warnAt: 14,
		dangerAt: 5,
		pastLabel: 'Overdue by {n} days',
		futureLabel: '{n} days left',
		todayLabel: 'Today',
		emptyText: 'No deadline',
	},
}

beforeEach(() => {
	jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
})

afterEach(() => {
	jest.restoreAllMocks()
})

describe('CnStatWidgetForm: the countdown display mode', () => {
	it('offers countdown beside text and badge', () => {
		const w = mountForm(null)
		expect(w.vm.displayOptions).toEqual(['text', 'badge', 'countdown'])
	})

	it('names the mode for a person, not by its key', () => {
		const w = mountForm(null)
		expect(w.vm.displayLabel('countdown')).toBe('Countdown to a date')
	})

	it('opens a stored countdown tile on the countdown mode', () => {
		const w = mountForm(dossiqDeadline)

		expect(w.vm.display).toBe('countdown')
		expect(w.vm.countdown).toEqual({ warnAt: '14', dangerAt: '5', pastLabel: 'Overdue by {n} days' })
	})

	it('hides the countdown settings for a tile that is not counting down', () => {
		const w = mountForm(null)
		expect(w.find('[data-testid="cn-stat-widget-form-countdown"]').exists()).toBe(false)

		w.vm.updateField('display', 'countdown')
		return w.vm.$nextTick().then(() => {
			expect(w.find('[data-testid="cn-stat-widget-form-countdown"]').exists()).toBe(true)
		})
	})

	it('writes the display mode and the thresholds somebody typed', () => {
		const w = mountForm(null)
		w.vm.updateField('display', 'countdown')
		w.vm.updateCountdown('warnAt', '14')
		w.vm.updateCountdown('dangerAt', '5')
		w.vm.updateCountdown('pastLabel', 'Overdue by {n} days')

		const emitted = lastEmit(w)
		expect(emitted.display).toBe('countdown')
		expect(emitted.countdown).toEqual({ warnAt: 14, dangerAt: 5, pastLabel: 'Overdue by {n} days' })
	})

	it('writes the thresholds as numbers, because the boxes hand back strings', () => {
		const w = mountForm(null)
		w.vm.updateField('display', 'countdown')
		w.vm.updateCountdown('dangerAt', '5')

		expect(lastEmit(w).countdown.dangerAt).toBe(5)
	})

	// AN EMPTY BOX IS AN ABSENT THRESHOLD, NOT ZERO. `Number('')` is 0, and a
	// `dangerAt: 0` paints every tile red on the day its deadline arrives,
	// which is not what clearing a box asks for.
	it('leaves a cleared threshold out rather than writing zero', () => {
		const w = mountForm(dossiqDeadline)
		w.vm.updateCountdown('dangerAt', '')

		const countdown = lastEmit(w).countdown
		expect(Object.hasOwn(countdown, 'dangerAt')).toBe(false)
		expect(countdown.warnAt).toBe(14)
	})

	it('accepts zero as a threshold somebody actually typed', () => {
		const w = mountForm(dossiqDeadline)
		w.vm.updateCountdown('dangerAt', '0')

		expect(lastEmit(w).countdown.dangerAt).toBe(0)
	})

	it('leaves out a threshold that is not a number', () => {
		const w = mountForm(dossiqDeadline)
		w.vm.updateCountdown('warnAt', 'soon')

		expect(Object.hasOwn(lastEmit(w).countdown, 'warnAt')).toBe(false)
	})

	it('writes no countdown block for a form that never touched one', () => {
		const w = mountForm(null)
		w.vm.updateField('display', 'countdown')

		const emitted = lastEmit(w)
		expect(emitted.display).toBe('countdown')
		expect(emitted.countdown).toBeUndefined()
	})

	it('still emits exactly the old keys when the mode is left alone', () => {
		const w = mountForm(null)
		w.vm.updateField('label', 'Open cases')

		expect(Object.keys(lastEmit(w))).toEqual(['label', 'icon', 'iconColor', 'valueColor', 'caption', 'format', 'source'])
	})
})

describe('CnStatWidgetForm: the countdown round trip', () => {
	it('round-trips a stored countdown tile unchanged', () => {
		const w = mountForm(dossiqDeadline)
		w.vm.updateField('label', 'Deadline')

		expect(lastEmit(w)).toEqual(dossiqDeadline)
	})

	it('keeps the countdown keys it cannot draw through an edit of one it can', () => {
		const w = mountForm(dossiqDeadline)
		w.vm.updateCountdown('warnAt', '21')

		const countdown = lastEmit(w).countdown
		expect(countdown).toEqual({
			unit: 'days',
			warnAt: 21,
			dangerAt: 5,
			pastLabel: 'Overdue by {n} days',
			futureLabel: '{n} days left',
			todayLabel: 'Today',
			emptyText: 'No deadline',
		})
	})

	it('keeps the countdown keys through an edit that has nothing to do with them', () => {
		const w = mountForm(dossiqDeadline)
		w.vm.updateField('icon', 'AlarmLight')

		expect(lastEmit(w).countdown.futureLabel).toBe('{n} days left')
		expect(lastEmit(w).countdown.emptyText).toBe('No deadline')
	})

	// Switching a tile to text to look at it must not be a way to lose its
	// thresholds, so the block is written whenever it holds anything.
	it('keeps the countdown block when the mode is flipped back to text', () => {
		const w = mountForm(dossiqDeadline)
		w.vm.updateField('display', 'text')

		const emitted = lastEmit(w)
		expect(emitted.display).toBeUndefined()
		expect(emitted.countdown).toEqual(dossiqDeadline.countdown)
	})

	it('keeps content keys it does not own beside a countdown', () => {
		const w = mountForm({ ...dossiqDeadline, route: { name: 'cases' } })
		w.vm.updateCountdown('warnAt', '30')

		const emitted = lastEmit(w)
		expect(emitted.route).toEqual({ name: 'cases' })
		expect(emitted.countdown.warnAt).toBe(30)
	})

	it('ignores a countdown key that is not an object at all', () => {
		const w = mountForm({ ...dossiqDeadline, countdown: 'days' })
		w.vm.updateField('label', 'Deadline')

		expect(lastEmit(w).countdown).toBeUndefined()
	})
})
