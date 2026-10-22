// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { resolveDeepTokens } from './resolveFilterTokens.js'
import { evaluateVisibleWhenLocal, isLocallyDecidableVisibleWhen } from './visibleWhen.js'

/**
 * The key under which a detail widget host provides its widget's header
 * actions to the card (CnWidgetWrapper, CnDetailCard) that draws them.
 */
export const WIDGET_HEADER_ACTIONS = 'cnWidgetHeaderActions'

/**
 * One drawn header button.
 *
 * @typedef {object} WidgetHeaderAction
 * @property {string} key Stable identity for the list.
 * @property {string} label The label, translated.
 * @property {string} icon A `CnIcon` name, or ''.
 * @property {'primary'|'secondary'} variant The button's weight.
 * @property {() => unknown} run Dispatches the action.
 */

/**
 * Resolve a widget's manifest `headerActions` into the buttons its card
 * header draws: `[{ label, icon?, variant?, visibleWhen?, action }]`.
 *
 * An entry needs a label and an action object. `visibleWhen` is decided on
 * the record; an entry whose condition the page cannot decide (it names an
 * endpoint or a source) is left out rather than shown wrongly. `run`
 * dispatches the action with `@objectId` and `@object.<field>` resolved.
 * An `edit-record` action opens the detail page's own record edit form
 * through `context.recordEdit` instead, and is left out where that form is
 * not available. An `open-tab` action (`{ type: 'open-tab', tab }`) opens
 * that tab of the page through the `#<tab>` anchor the tab strip follows.
 *
 * @param {object|null} widget The widget definition.
 * @param {object} context `{ object, objectId, translate?, dispatch, recordEdit? }`; `recordEdit` is
 *   `{ available, open }` from the detail page.
 * @return {WidgetHeaderAction[]} The buttons, in manifest order.
 * @spec openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-a-widget-declares-buttons-for-its-card-header
 */
export function resolveWidgetHeaderActions(widget, context = {}) {
	const list = widget && Array.isArray(widget.headerActions) ? widget.headerActions : []
	const object = context.object || {}
	const translate = typeof context.translate === 'function' ? context.translate : (key) => key
	const tokenCtx = { objectId: context.objectId, object }
	return list
		.filter((entry) => entry && typeof entry.label === 'string' && entry.label !== '' && entry.action && typeof entry.action === 'object')
		.filter((entry) => entry.action.type !== 'edit-record' || context.recordEdit?.available === true)
		.filter((entry) => {
			if (!entry.visibleWhen) {
				return true
			}
			return isLocallyDecidableVisibleWhen(entry.visibleWhen) && evaluateVisibleWhenLocal(entry.visibleWhen, object)
		})
		.map((entry, index) => ({
			key: `${index}-${entry.label}`,
			label: translate(entry.label),
			icon: typeof entry.icon === 'string' ? entry.icon : '',
			variant: entry.variant === 'primary' ? 'primary' : 'secondary',
			run: () => {
				if (entry.action.type === 'edit-record') {
					return context.recordEdit.open()
				}
				if (entry.action.type === 'open-tab') {
					window.location.hash = encodeURIComponent(String(entry.action.tab || ''))
					return undefined
				}
				return typeof context.dispatch === 'function' ? context.dispatch(resolveDeepTokens(entry.action, tokenCtx)) : undefined
			},
		}))
}
