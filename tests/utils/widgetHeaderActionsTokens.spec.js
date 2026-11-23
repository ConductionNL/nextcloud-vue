/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail card's header action hands the record on as token context, so a
 * `navigate` target fills `@object.<field>` inside the URL ("Compose in Mail"
 * opening Mail on the client's address).
 *
 * @spec openspec/changes/timeline-activity-card/specs/timeline-widget/spec.md
 */
import { resolveWidgetHeaderActions } from '../../src/utils/widgetHeaderActions.js'

describe('resolveWidgetHeaderActions: token context', () => {
	it('dispatches with the record as token context on a detail page', () => {
		const dispatch = jest.fn()
		const widget = { headerActions: [{ label: 'Compose in Mail', variant: 'tonal', action: { type: 'navigate', target: '/index.php/apps/mail/compose?uri=mailto:@object.email' } }] }
		const [button] = resolveWidgetHeaderActions(widget, { object: { email: 'a@example.nl' }, objectId: 'k-1', dispatch })
		button.run()
		expect(dispatch).toHaveBeenCalledWith(
			{ type: 'navigate', target: '/index.php/apps/mail/compose?uri=mailto:@object.email' },
			{ tokenCtx: { objectId: 'k-1', object: { email: 'a@example.nl' }, workspace: {} } },
		)
	})
})
