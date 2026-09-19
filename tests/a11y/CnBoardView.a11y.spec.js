/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnBoardView`.
 *
 * 🔴 THIS SUITE IS THE POINT OF THE CHANGE THAT ADDED IT. Gate 32
 * `semantic-controls` found the board's card was a tab stop carrying
 * `tabindex="0"`, an `aria-label`, a click handler and an Enter handler, and
 * no role at all. It found it only because a quality sweep ran the gates by
 * hand: `npm run check:a11y` ran nine suites and `CnBoardView` was not one of
 * them, so no axe assertion had ever looked at this component. Its absence was
 * indistinguishable from its success.
 *
 * 🔑 AXE ALONE WOULD NOT HAVE CAUGHT IT, which is why the structural
 * assertions sit beside the scan. A focusable element with no role and an
 * `aria-label` breaks no axe rule; it is simply a thing a reader cannot be
 * told the kind of. Same shape as the href-less "View all" anchor recorded in
 * `CnDataTable.a11y.spec.js`.
 *
 * 🔑 WHY `role="button"` IS ASSERTED ABSENT RATHER THAN PRESENT. The card
 * contains a `<select>`, the keyboard's only way to move a card. An element
 * with `role="button"` has presentational children, so that role here would
 * put an interactive control inside a button, break the move path and collapse
 * every field into one label. The gate's own one-attribute suggestion is the
 * regression. See `openspec/changes/board-card-role-and-keyboard`.
 *
 * 🔑 THIS SUITE WAS MADE TO FAIL BEFORE IT WAS TRUSTED. Two mutations, both on
 * the real component, both reverted:
 *
 *   1. Strip the opening button's `aria-label`: 1 test red. A board of buttons
 *      all called "Open" is what that name prevents.
 *   2. Take gate 32's own suggestion, `role="button"` on the card: 4 tests red,
 *      and axe names it without being told what to look for, `nested-interactive`
 *      (serious, "Interactive controls must not be nested") and
 *      `aria-required-children` (critical).
 *
 * The second is the whole argument, confirmed by a tool that has no opinion
 * about it.
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnBoardView = require('../../src/components/CnBoardView/CnBoardView.vue').default

const statusFieldSchema = {
	enum: ['open', 'doing', 'done'],
	enumLabels: { open: 'Open', doing: 'Doing', done: 'Done' },
}
const rows = [
	{ id: 1, status: 'open', title: 'Vergunning Kerkstraat', who: 'alice' },
	{ id: 2, status: 'open', title: 'Bezwaar Molenweg', who: 'bob' },
	{ id: 3, status: 'doing', title: 'Handhaving Dorpsplein', who: 'alice' },
]
const baseProps = {
	rows,
	statusFieldSchema,
	statusField: 'status',
	cardFields: ['title'],
}

describe('CnBoardView — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations as a read-only board', async () => {
		wrapper = mountAttached(CnBoardView, { propsData: { ...baseProps } })

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with the move control on every card', async () => {
		wrapper = mountAttached(CnBoardView, {
			propsData: { ...baseProps, runTransition: async () => ({ outcome: 'moved' }) },
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with swimlanes', async () => {
		wrapper = mountAttached(CnBoardView, {
			propsData: { ...baseProps, swimlaneField: 'who' },
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations when the field cannot back a board', async () => {
		wrapper = mountAttached(CnBoardView, {
			propsData: { ...baseProps, statusFieldSchema: {} },
		})

		await expectAccessible(wrapper)
	})

	describe('the card is a container and its actions are controls', () => {
		it('names the kind of every focusable thing on a card', () => {
			wrapper = mountAttached(CnBoardView, {
				propsData: { ...baseProps, runTransition: async () => ({ outcome: 'moved' }) },
			})

			const card = wrapper.element.querySelector('[data-testid="cn-board-card"]')

			expect(card.getAttribute('role')).toBe('listitem')
			expect(card.getAttribute('role')).not.toBe('button')
			expect(card.hasAttribute('tabindex')).toBe(false)

			// Every focusable descendant is a native control, so each one has a
			// role and an activation behaviour the browser supplies.
			const focusable = [...card.querySelectorAll('button, select, a[href], [tabindex]')]
			expect(focusable.length).toBeGreaterThan(0)
			focusable.forEach((element) => {
				expect(['BUTTON', 'SELECT']).toContain(element.tagName)
			})
		})

		it('gives the opening control the name of the card it opens', () => {
			wrapper = mountAttached(CnBoardView, { propsData: { ...baseProps } })

			const open = wrapper.element.querySelector('[data-testid="cn-board-card-open"]')

			expect(open.tagName).toBe('BUTTON')
			expect(open.getAttribute('type')).toBe('button')
			// The mutation this suite exists to catch: strip this name and the
			// board becomes a column of buttons all called "Open".
			expect(open.getAttribute('aria-label')).toContain('Vergunning Kerkstraat')
		})

		it('keeps the move control out of the opening button', () => {
			wrapper = mountAttached(CnBoardView, {
				propsData: { ...baseProps, runTransition: async () => ({ outcome: 'moved' }) },
			})

			const move = wrapper.element.querySelector('[data-testid="cn-board-move"]')

			expect(move).not.toBeNull()
			expect(move.closest('button')).toBeNull()
			expect(move.closest('[role="button"]')).toBeNull()
		})

		it('tells a reader how many cards a column holds', () => {
			wrapper = mountAttached(CnBoardView, { propsData: { ...baseProps } })

			const lists = [...wrapper.element.querySelectorAll('.cn-board-view__cards')]

			expect(lists).toHaveLength(2)
			lists.forEach((list) => {
				expect(list.getAttribute('role')).toBe('list')
				expect(list.getAttribute('aria-label')).toBeTruthy()
				expect(list.querySelectorAll('[role="listitem"]').length).toBeGreaterThan(0)
			})
		})
	})
})
