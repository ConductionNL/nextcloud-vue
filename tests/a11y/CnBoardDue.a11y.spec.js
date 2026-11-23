/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for late marking on `CnBoardView` cards.
 *
 * An edge in the error colour is the part a sighted reader notices, and the
 * part nobody else gets. The assertion beside the scan holds the card to
 * saying it in words too.
 */

const CnBoardView = require('../../src/components/CnBoardView/CnBoardView.vue').default
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

/**
 * @param {number} days Days from today.
 * @return {string} A bare local date.
 */
function day(days) {
	const d = new Date()
	d.setDate(d.getDate() + days)
	const pad = (n) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const propsData = {
	rows: [
		{ id: 1, status: 'open', title: 'Parking permits', deadline: day(-2) },
		{ id: 2, status: 'open', title: 'Youth care tender', deadline: day(1) },
		{ id: 3, status: 'doing', title: 'Street lighting', deadline: day(40) },
	],
	statusFieldSchema: { enum: ['open', 'doing'], enumLabels: { open: 'Open', doing: 'Doing' } },
	statusField: 'status',
	cardFields: ['title'],
	dueRule: { field: 'deadline', soonDays: 3 },
}

describe('CnBoardView late marking: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with overdue and soon cards', async () => {
		wrapper = mountAttached(CnBoardView, { propsData })
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with late cards and the move control', async () => {
		wrapper = mountAttached(CnBoardView, {
			propsData: { ...propsData, runTransition: async () => ({ outcome: 'moved' }) },
		})
		await expectAccessible(wrapper)
	})

	it('says late in text inside the card, not by its edge alone', () => {
		wrapper = mountAttached(CnBoardView, { propsData })
		const cards = [...wrapper.element.querySelectorAll('[data-testid="cn-board-card"]')]
		expect(cards[0].textContent).toContain('Overdue')
		expect(cards[1].textContent).toContain('Due soon')
		expect(cards[2].textContent).not.toMatch(/Overdue|Due soon/)
	})
})
