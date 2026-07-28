/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnDashboardGrid` — the GridStack-backed
 * dashboard canvas.
 *
 * The interesting state is EDIT mode: that's where each grid item becomes a
 * named ARIA `group` with a tab stop and an `aria-describedby` pointer at the
 * shared key map, i.e. where the keyboard equivalent of the pointer-only drag
 * lives (WCAG 2.1 SC 2.1.1). Both the named-group markup and the
 * `aria-describedby` reference are exactly the kind of thing that rots
 * silently — a dangling id or an empty accessible name reads fine in a diff
 * and fails for a screen-reader user — so axe scans both modes.
 */

const { mountAttached } = require('./support/mountAttached.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnDashboardGrid = require('../../src/components/CnDashboardGrid/CnDashboardGrid.vue').default

const layout = [
	{ id: 'a', title: 'Open tickets', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 },
	{ id: 'b', title: 'Revenue', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 2 },
]

const slots = { widget: '<div class="demo-widget"><p>Widget body</p></div>' }

describe('CnDashboardGrid — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations in read-only mode', async () => {
		wrapper = mountAttached(CnDashboardGrid, { propsData: { layout }, slots })

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations in edit mode (focusable, described groups)', async () => {
		wrapper = mountAttached(CnDashboardGrid, {
			propsData: { layout, editable: true },
			slots,
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations after a keyboard move populates the live region', async () => {
		wrapper = mountAttached(CnDashboardGrid, {
			propsData: { layout, editable: true },
			slots,
		})

		await wrapper.findAll('.grid-stack-item').at(0).trigger('keydown', { key: 'ArrowRight' })
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('every grid item is a group with a non-empty accessible name', () => {
		wrapper = mountAttached(CnDashboardGrid, {
			propsData: { layout, editable: true },
			slots,
		})

		const nodes = wrapper.element.querySelectorAll('.grid-stack-item')
		expect(nodes.length).toBe(2)
		nodes.forEach(node => {
			expect(node.getAttribute('role')).toBe('group')
			expect(node.getAttribute('tabindex')).toBe('0')
			expect((node.getAttribute('aria-label') || '').trim().length).toBeGreaterThan(0)
			// The description target must actually exist in the document.
			const describedBy = node.getAttribute('aria-describedby')
			expect(describedBy).toBeTruthy()
			expect(wrapper.element.querySelector(`#${describedBy}`)).not.toBeNull()
		})
	})
})
