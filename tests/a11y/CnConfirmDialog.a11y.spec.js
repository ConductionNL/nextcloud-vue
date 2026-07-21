/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnConfirmDialog` — the fleet's generic
 * modal/dialog base (two-phase confirm → result, wraps the real
 * `NcDialog`). Part of the `wcag-a11y-anchor` sample: proves
 * `expectAccessible` against a real dialog (role="dialog", aria-modal,
 * focus-relevant close button) and both of the component's own
 * content phases.
 */

const { mountAttached } = require('./support/mountAttached.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnConfirmDialog = require('../../src/dialogs/CnConfirmDialog.vue').default

describe('CnConfirmDialog — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.destroy()
	})

	it('has no WCAG 2.1 AA violations in the confirm phase', async () => {
		wrapper = mountAttached(CnConfirmDialog, {
			propsData: {
				dialogTitle: 'Delete this item?',
				message: 'This action cannot be undone.',
				variant: 'error',
			},
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations in the result phase', async () => {
		wrapper = mountAttached(CnConfirmDialog, {
			propsData: {
				dialogTitle: 'Delete this item?',
				successText: 'Item deleted.',
			},
		})
		wrapper.vm.setResult({ success: true })
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations while the confirm button is loading', async () => {
		wrapper = mountAttached(CnConfirmDialog, {
			propsData: { dialogTitle: 'Delete this item?' },
		})
		wrapper.vm.executeConfirm()
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations when reporting an error result', async () => {
		wrapper = mountAttached(CnConfirmDialog, {
			propsData: { dialogTitle: 'Delete this item?' },
		})
		wrapper.vm.setResult({ error: 'Deletion failed: the item is still referenced.' })
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})
})
