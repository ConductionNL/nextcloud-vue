/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCountdownWidget — how long is left until a date on the bound record.
 *
 * The arithmetic is the whole component, so that is what these cover: the
 * boundaries (today, tomorrow, yesterday), the overdue wording, the threshold
 * bands, and the two states that must NOT read as "on time" — an unset date and
 * an unparseable one.
 */
import { mount } from '@vue/test-utils'
import CnCountdownWidget from '../../src/components/CnCountdownWidget/CnCountdownWidget.vue'

/**
 * An ISO date `offset` whole days from today.
 *
 * @param {number} offset Days from today; negative is in the past.
 * @return {string} An ISO date string.
 */
function daysFromToday(offset) {
	const d = new Date()
	d.setDate(d.getDate() + offset)
	return d.toISOString().slice(0, 10)
}

function mountTile(content, record) {
	return mount(CnCountdownWidget, {
		props: { content: { field: 'deadline', ...content }, objectData: record },
	})
}

describe('CnCountdownWidget', () => {
	describe('the headline', () => {
		it('counts whole days left', () => {
			const w = mountTile({}, { deadline: daysFromToday(12) })
			expect(w.text()).toContain('12 days left')
		})

		it('says "Due today" rather than "0 days left"', () => {
			const w = mountTile({}, { deadline: daysFromToday(0) })
			expect(w.text()).toContain('Due today')
		})

		it('uses the singular for one day', () => {
			const w = mountTile({}, { deadline: daysFromToday(1) })
			expect(w.text()).toContain('1 day left')
			expect(w.text()).not.toContain('1 days left')
		})

		it('reads a past date as overdue, never as a negative number', () => {
			// "-3 days left" is a puzzle, and an overdue case is the one state a
			// handler must not have to decode.
			const w = mountTile({}, { deadline: daysFromToday(-3) })
			expect(w.text()).toContain('3 days overdue')
			expect(w.text()).not.toContain('-3')
		})

		it('uses the singular for one day overdue', () => {
			const w = mountTile({}, { deadline: daysFromToday(-1) })
			expect(w.text()).toContain('1 day overdue')
		})
	})

	describe('threshold bands', () => {
		it('stays neutral outside every band', () => {
			const w = mountTile({ thresholds: { warn: 14, danger: 5 } }, { deadline: daysFromToday(30) })
			expect(w.classes()).toContain('cn-countdown-widget--default')
		})

		it('warns inside the warn band', () => {
			const w = mountTile({ thresholds: { warn: 14, danger: 5 } }, { deadline: daysFromToday(10) })
			expect(w.classes()).toContain('cn-countdown-widget--warning')
		})

		it('alerts inside the danger band, which wins over warn', () => {
			const w = mountTile({ thresholds: { warn: 14, danger: 5 } }, { deadline: daysFromToday(3) })
			expect(w.classes()).toContain('cn-countdown-widget--error')
		})

		it('alerts on an overdue date even with no thresholds configured', () => {
			const w = mountTile({}, { deadline: daysFromToday(-1) })
			expect(w.classes()).toContain('cn-countdown-widget--error')
		})
	})

	describe('a date that is not there', () => {
		it('renders a dash for an unset date', () => {
			const w = mountTile({}, { deadline: null })
			expect(w.text()).toContain('—')
		})

		it('renders a dash for a missing property', () => {
			const w = mountTile({}, { title: 'A case with no deadline' })
			expect(w.text()).toContain('—')
		})

		it('renders a dash for an unparseable value', () => {
			const w = mountTile({}, { deadline: 'sometime next week' })
			expect(w.text()).toContain('—')
		})

		it('does NOT colour an unset date as on time', () => {
			// A case with no deadline is not urgent and is not on time. It has no
			// deadline, and colouring it would claim otherwise.
			const w = mountTile({ thresholds: { warn: 14, danger: 5 } }, { deadline: null })
			expect(w.classes()).toContain('cn-countdown-widget--default')
		})
	})

	describe('the date underneath', () => {
		it('shows the absolute date by default', () => {
			// "12 days left" and "5 October" answer different questions, and a
			// handler asks both.
			const w = mountTile({}, { deadline: '2030-10-05' })
			expect(w.find('.cn-countdown-widget__sub').exists()).toBe(true)
		})

		it('can be switched off', () => {
			const w = mountTile({ showDate: false }, { deadline: '2030-10-05' })
			expect(w.find('.cn-countdown-widget__sub').exists()).toBe(false)
		})
	})

	it('renders the configured label', () => {
		const w = mountTile({ label: 'Time left' }, { deadline: daysFromToday(4) })
		expect(w.text()).toContain('Time left')
	})

	it('reads a nested property by dot path', () => {
		const w = mountTile({ field: 'dates.decision' }, { dates: { decision: daysFromToday(7) } })
		expect(w.text()).toContain('7 days left')
	})
})
