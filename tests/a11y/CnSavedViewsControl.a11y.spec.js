/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for saved views: the toolbar's `CnSavedViewsControl`
 * (Save view and the chips) and the sidebar's `CnSavedViewsPanel` (the
 * list, and one view's own `NcActions` menu). Part of the
 * `wcag-a11y-anchor` sample.
 *
 * Menu content is scanned via `openNcActionsMenu()` — see that helper's
 * docblock for why the popover wrapper itself can't be scanned directly
 * under jsdom.
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const { openNcActionsMenu } = require('./support/openNcActionsMenu.js')
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default

const views = [
	{ id: '1', name: 'My pipeline view', owner: 'alice' },
	{ id: '2', name: "Bob's view", owner: 'bob' },
]

describe('saved views — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('the toolbar control has no WCAG 2.1 AA violations, with and without chips', async () => {
		wrapper = mountAttached(CnSavedViewsControl, { propsData: { views, currentUserId: 'alice' } })
		await expectAccessible(wrapper)
		wrapper.unmount()
		wrapper = mountAttached(CnSavedViewsControl, { propsData: { views, currentUserId: 'alice' }, global: { provide: { cnLook: 'board' } } })
		await expectAccessible(wrapper)
	})

	it('the panel has no violations while loading and when empty', async () => {
		wrapper = mountAttached(CnSavedViewsPanel, { propsData: { views: [], loading: true } })
		await expectAccessible(wrapper)
		wrapper.unmount()
		wrapper = mountAttached(CnSavedViewsPanel, { propsData: { views: [] } })
		await expectAccessible(wrapper)
	})

	it('the panel has no violations with own and shared views', async () => {
		wrapper = mountAttached(CnSavedViewsPanel, { propsData: { views, currentUserId: 'alice', menuIds: [] } })
		await expectAccessible(wrapper)
	})

	it('one view\'s menu has no violations', async () => {
		wrapper = mountAttached(CnSavedViewsPanel, { propsData: { views: views.slice(0, 1), currentUserId: 'alice', menuIds: [] } })
		// The first button is Save view; open the row's own menu instead.
		const row = wrapper.find('[data-testid="cn-saved-views-manage"]')
		const menu = await openNcActionsMenu({ find: (selector) => row.find(selector), vm: wrapper.vm })
		await expectAccessible(menu)
	})
})
