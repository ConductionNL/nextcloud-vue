/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget header action `{ type: 'open-sidebar-tab', tab }` opens the page's
 * object sidebar on that tab (DqZaakBetrokkenen Toegang "Delen" opens the
 * case's Sharing tab). It shows only where the page has an object sidebar.
 *
 * @spec openspec/changes/widget-header-open-sidebar-tab/specs/widget-header-actions/spec.md#requirement-a-widget-header-button-can-open-a-sidebar-tab
 */
import { resolveWidgetHeaderActions } from '../../src/utils/widgetHeaderActions.js'

const WIDGET = { headerActions: [{ label: 'Share', action: { type: 'open-sidebar-tab', tab: 'sharing' } }] }

describe('resolveWidgetHeaderActions: open-sidebar-tab', () => {
	it('opens the sidebar on the named tab and does not dispatch', () => {
		const sidebar = { open: false, requestedTab: null }
		const dispatch = jest.fn()
		const [button] = resolveWidgetHeaderActions(WIDGET, { object: {}, dispatch, sidebar })
		button.run()
		expect(sidebar).toEqual({ open: true, requestedTab: 'sharing' })
		expect(dispatch).not.toHaveBeenCalled()
	})

	it('leaves the button out where the page has no object sidebar', () => {
		expect(resolveWidgetHeaderActions(WIDGET, { object: {}, dispatch: jest.fn() })).toEqual([])
		expect(resolveWidgetHeaderActions(WIDGET, { object: {}, dispatch: jest.fn(), sidebar: null })).toEqual([])
	})
})
