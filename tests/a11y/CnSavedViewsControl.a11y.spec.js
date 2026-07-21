/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnSavedViewsControl` — the saved-views
 * toolbar dropdown (real `NcActions` popover menu). Part of the
 * `wcag-a11y-anchor` sample.
 *
 * Menu content is scanned via `openNcActionsMenu()` — see that helper's
 * docblock for why the popover wrapper itself can't be scanned directly
 * under jsdom.
 */

const { mountAttached } = require('./support/mountAttached.js')
const { openNcActionsMenu } = require('./support/openNcActionsMenu.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default

describe('CnSavedViewsControl — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.destroy()
	})

	it('has no WCAG 2.1 AA violations in the closed (default) state', async () => {
		wrapper = mountAttached(CnSavedViewsControl, {
			propsData: { views: [] },
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations in the loading menu state', async () => {
		wrapper = mountAttached(CnSavedViewsControl, {
			propsData: { views: [], loading: true },
		})

		const menu = await openNcActionsMenu(wrapper)
		await expectAccessible(menu)
	})

	it('has no WCAG 2.1 AA violations in the empty menu state', async () => {
		wrapper = mountAttached(CnSavedViewsControl, {
			propsData: { views: [] },
		})

		const menu = await openNcActionsMenu(wrapper)
		await expectAccessible(menu)
	})

	it('has no WCAG 2.1 AA violations with a mix of own and foreign views', async () => {
		wrapper = mountAttached(CnSavedViewsControl, {
			propsData: {
				views: [
					{ id: '1', name: 'My pipeline view', owner: 'alice' },
					{ id: '2', name: "Bob's view", owner: 'bob' },
				],
				currentUserId: 'alice',
			},
		})

		const menu = await openNcActionsMenu(wrapper)
		await expectAccessible(menu)
	})
})
