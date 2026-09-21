/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The date axis as a component.
 *
 * The layout is pure and tested on its own. What is tested here is what a unit
 * test of the layout cannot see: that an overlap is two rows ON SCREEN, that
 * the unplanned work renders rather than being a number in an object, and that
 * a bar positioned by percentage says something to a reader who cannot see it.
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnDateAxisView = require('../../src/components/CnDateAxisView/CnDateAxisView.vue').default

/**
 * Mount the view.
 *
 * @param {Array<object>} rows The rows.
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountAxis(rows, props = {}) {
	return mount(CnDateAxisView, {
		props: { rows, startField: 'from', endField: 'to', labelField: 'title', ...props },
	})
}

describe('overlaps are visible on screen', () => {
	it('renders two tracks for two overlapping bars', () => {
		const wrapper = mountAxis([
			{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-10' },
			{ id: 2, title: 'Twee', from: '2026-01-05', to: '2026-01-15' },
		])

		expect(wrapper.findAll('[data-testid="cn-date-axis-track"]')).toHaveLength(2)
		expect(wrapper.findAll('[data-testid="cn-date-axis-bar"]')).toHaveLength(2)
	})

	it('renders one track for two that do not overlap', () => {
		// The control: a view that gave every bar its own track would pass the
		// test above and make every lane as tall as it has work.
		const wrapper = mountAxis([
			{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-05' },
			{ id: 2, title: 'Twee', from: '2026-01-06', to: '2026-01-10' },
		])

		expect(wrapper.findAll('[data-testid="cn-date-axis-track"]')).toHaveLength(1)
	})
})

describe('work with no dates', () => {
	it('renders in a visible unplanned lane', () => {
		// Exactly what a planner is looking for, so it must not be the one
		// thing the view leaves out.
		const wrapper = mountAxis([
			{ id: 1, title: 'Gepland', from: '2026-01-01', to: '2026-01-05' },
			{ id: 2, title: 'Ongepland' },
		])

		const unplanned = wrapper.find('[data-testid="cn-date-axis-unplanned"]')
		expect(unplanned.exists()).toBe(true)
		expect(unplanned.text()).toContain('Ongepland')
	})

	it('renders no unplanned lane when everything is placed', () => {
		const wrapper = mountAxis([{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-05' }])

		expect(wrapper.find('[data-testid="cn-date-axis-unplanned"]').exists()).toBe(false)
	})
})

describe('a bar says what it is', () => {
	it('carries the row, and both dates, in its accessible name', () => {
		// A bar positioned by percentage says nothing at all to a reader who
		// cannot see it.
		const wrapper = mountAxis([{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-05' }])

		expect(wrapper.find('[data-testid="cn-date-axis-bar"]').attributes('aria-label'))
			.toBe('Een, 2026-01-01 to 2026-01-05')
	})

	it('is a button, so a keyboard reaches it', () => {
		const wrapper = mountAxis([{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-05' }])

		expect(wrapper.find('[data-testid="cn-date-axis-bar"]').element.tagName).toBe('BUTTON')
	})

	it('opens the row and changes nothing', async () => {
		// The one gesture. A view that rescheduled on drag would be moving
		// statutory dates from a picture.
		const row = { id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-05' }
		const wrapper = mountAxis([row])

		await wrapper.find('[data-testid="cn-date-axis-bar"]').trigger('click')

		// toEqual, not toBe: Vue hands the payload back through a reactive
		// proxy, so identity is not the thing to assert. What matters is that
		// the row came back and that nothing wrote to it.
		expect(wrapper.emitted()['row-click'][0][0]).toEqual(row)
		expect(row.from).toBe('2026-01-01')
	})
})

describe('the scale', () => {
	it('gives a single bar the whole lane rather than dividing by zero', () => {
		const wrapper = mountAxis([{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-01' }])
		const style = wrapper.find('[data-testid="cn-date-axis-bar"]').attributes('style')

		expect(style).toContain('100%')
	})

	it('positions a later bar further along than an earlier one', () => {
		const wrapper = mountAxis([
			{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-02' },
			{ id: 2, title: 'Twee', from: '2026-01-09', to: '2026-01-10' },
		])
		const bars = wrapper.findAll('[data-testid="cn-date-axis-bar"]')

		expect(bars[0].attributes('style')).toContain('margin-inline-start: 0%')
		expect(bars[1].attributes('style')).not.toContain('margin-inline-start: 0%')
	})
})

describe('lanes', () => {
	it('renders one lane per value, named', () => {
		const wrapper = mountAxis([
			{ id: 1, title: 'Een', from: '2026-01-01', to: '2026-01-02', who: 'alice' },
			{ id: 2, title: 'Twee', from: '2026-01-01', to: '2026-01-02', who: 'bob' },
		], { laneField: 'who' })

		expect(wrapper.findAll('[data-testid="cn-date-axis-lane"]').map((lane) => lane.attributes('data-lane'))).toEqual(['alice', 'bob'])
	})

	it('says so when there is nothing at all', () => {
		expect(mountAxis([]).find('[data-testid="cn-date-axis-empty"]').exists()).toBe(true)
	})
})
