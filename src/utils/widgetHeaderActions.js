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
 * The key under which a detail widget host provides its widget's body
 * actions (`bodyActions`) to a leaf that draws its own button row in the
 * card body, after its own buttons.
 */
export const WIDGET_BODY_ACTIONS = 'cnWidgetBodyActions'

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
 *
 * @param {object|null} widget The widget definition.
 * @param {object} context `{ object, objectId, translate?, dispatch }`.
 * @param {string} [key] The list to read: `headerActions` (default) or `bodyActions`.
 * @return {WidgetHeaderAction[]} The buttons, in manifest order.
 * @spec openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-a-widget-declares-buttons-for-its-card-header
 */
export function resolveWidgetHeaderActions(widget, context = {}, key = 'headerActions') {
	const list = widget && Array.isArray(widget[key]) ? widget[key] : []
	const object = context.object || {}
	const translate = typeof context.translate === 'function' ? context.translate : (key) => key
	const tokenCtx = { objectId: context.objectId, object }
	return list
		.filter((entry) => entry && typeof entry.label === 'string' && entry.label !== '' && entry.action && typeof entry.action === 'object')
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
			run: () => (typeof context.dispatch === 'function' ? context.dispatch(resolveDeepTokens(entry.action, tokenCtx)) : undefined),
		}))
}
