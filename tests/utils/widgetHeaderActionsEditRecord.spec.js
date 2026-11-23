/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget header action `{ type: 'edit-record' }` opens the detail page's
 * own record edit form (DqZaaktype "Termijnen" Bewerken, DqZaaktypeOverzicht
 * "Statussen" Bewerken). It shows only where the page itself may edit the
 * record, and never reaches the generic dispatcher. `{ type: 'open-tab', tab }`
 * opens another tab of the page (DqZaaktypeOverzicht "Regels" Regel toevoegen
 * opens the Rules tab).
 *
 * @spec openspec/changes/widget-header-page-actions/specs/widget-header-page-actions/spec.md#requirement-a-widget-header-button-can-open-the-pages-edit-form-or-another-tab
 */
import { resolveWidgetHeaderActions } from '../../src/utils/widgetHeaderActions.js'

const WIDGET = { headerActions: [{ label: 'Edit', action: { type: 'edit-record' } }] }

describe('resolveWidgetHeaderActions: edit-record', () => {
	it('opens the page\'s edit form and does not dispatch', () => {
		const open = jest.fn()
		const dispatch = jest.fn()
		const [button] = resolveWidgetHeaderActions(WIDGET, { object: {}, dispatch, recordEdit: { available: true, open } })
		button.run()
		expect(open).toHaveBeenCalledTimes(1)
		expect(dispatch).not.toHaveBeenCalled()
	})

	it('leaves the button out where the page may not edit the record', () => {
		expect(resolveWidgetHeaderActions(WIDGET, { object: {}, dispatch: jest.fn(), recordEdit: { available: false, open: jest.fn() } })).toEqual([])
	})

	it('leaves the button out outside a detail page', () => {
		expect(resolveWidgetHeaderActions(WIDGET, { object: {}, dispatch: jest.fn() })).toEqual([])
	})
})

describe('resolveWidgetHeaderActions: open-tab', () => {
	it('opens the named tab through the page anchor and does not dispatch', () => {
		const dispatch = jest.fn()
		const [button] = resolveWidgetHeaderActions({ headerActions: [{ label: 'Edit', action: { type: 'open-tab', tab: 'statuses' } }] }, { object: {}, dispatch })
		button.run()
		expect(window.location.hash).toBe('#statuses')
		expect(dispatch).not.toHaveBeenCalled()
	})
})
