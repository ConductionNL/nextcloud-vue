/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWeekStripWidget: a cap per day and the "+N more" control
 * (screens-week-strip-max-per-day).
 *
 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md
 */
import { mount } from '@vue/test-utils'
import CnWeekStripWidget from '../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'

// Wednesday 7 October 2026.
const NOW = new Date(2026, 9, 7, 10, 0)
const items = [
	...Array.from({ length: 8 }, (_, i) => ({ title: `Wednesday ${i + 1}`, date: '2026-10-07' })),
	{ title: 'Monday 1', date: '2026-10-05' },
	{ title: 'Monday 2', date: '2026-10-05' },
]

function mountStrip(content, options = {}) {
	return mount(CnWeekStripWidget, { propsData: { content: { items, ...content }, now: NOW }, ...options })
}

const day = (wrapper, key) => wrapper.find(`[data-day="${key}"]`)
const count = (wrapper, key) => day(wrapper, key).findAll('[data-testid="cn-week-strip-item"]').length
const more = (wrapper, key) => day(wrapper, key).find('[data-testid="cn-week-strip-more"]')

describe('CnWeekStripWidget maxPerDay', () => {
	it('shows every item and no control without maxPerDay', () => {
		const wrapper = mountStrip({})
		expect(count(wrapper, '2026-10-07')).toBe(8)
		expect(wrapper.find('[data-testid="cn-week-strip-more"]').exists()).toBe(false)
	})

	it('caps a full day and counts the rest; a day within the cap has no control', () => {
		const wrapper = mountStrip({ maxPerDay: 3 })
		expect(count(wrapper, '2026-10-07')).toBe(3)
		expect(more(wrapper, '2026-10-07').text()).toBe('+5 more')
		expect(count(wrapper, '2026-10-05')).toBe(2)
		expect(more(wrapper, '2026-10-05').exists()).toBe(false)
	})

	it('opens the day in place and closes it again', async () => {
		const wrapper = mountStrip({ maxPerDay: 3 })
		const button = more(wrapper, '2026-10-07')
		expect(button.element.tagName).toBe('BUTTON')
		expect(button.attributes('aria-expanded')).toBe('false')
		await button.trigger('click')
		expect(count(wrapper, '2026-10-07')).toBe(8)
		expect(more(wrapper, '2026-10-07').text()).toBe('Show less')
		expect(more(wrapper, '2026-10-07').attributes('aria-expanded')).toBe('true')
		await more(wrapper, '2026-10-07').trigger('click')
		expect(count(wrapper, '2026-10-07')).toBe(3)
	})

	it('links to moreRoute and takes its own label through translate', () => {
		const $router = { resolve: (to) => ({ href: `/r/${to.name}` }), push: jest.fn() }
		const wrapper = mountStrip(
			{ maxPerDay: 2, moreRoute: 'Cases', moreLabel: 'and {count} others' },
			{ mocks: { $router }, provide: { cnTranslate: (key) => (key === 'and {count} others' ? 'en {count} andere' : key) } },
		)
		const link = more(wrapper, '2026-10-07')
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('/r/Cases')
		expect(link.text()).toBe('en 6 andere')
	})

	it('ignores a cap that is not a positive whole number', () => {
		expect(count(mountStrip({ maxPerDay: 0 }), '2026-10-07')).toBe(8)
		expect(count(mountStrip({ maxPerDay: 'x' }), '2026-10-07')).toBe(8)
	})
})
