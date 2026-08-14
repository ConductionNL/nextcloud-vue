/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useWidgetForm — small Vue 2 composable shared by the `CnAddWidgetModal` host
 * and the per-type sub-form components (cn-widget-library). It owns the four
 * state-management helpers the modal needs while keeping the host template free
 * of form bookkeeping noise:
 *
 * - `resetForm(type)`: drop in a fresh copy of the registry's `defaultContent`
 *   for `type`, used when the user opens the modal in create mode or switches
 *   the type select mid-edit (type switch resets form state, no cross-type
 *   leakage).
 * - `loadEditingWidget(widget)`: pre-fill state from an existing placement when
 *   the modal opens in edit mode.
 * - `validate(activeSubFormRef)`: forwards to the active sub-form's `validate()`
 *   method. The composable does not own per-type validation logic — sub-forms
 *   do.
 * - `assembleContent(activeSubFormRef)`: ask the active sub-form for its current
 *   content payload, falling back to the composable's own state for sub-forms
 *   that drive the modal via `update:content` rather than exposing an
 *   `assembledContent` getter.
 *
 * The composable returns a `Vue.observable` state container (Vue 2.7 / Options
 * API — `@vue/composition-api` is not in this codebase): any component that
 * touches `state.content` / `state.type` re-renders on change, the same way a
 * `data()` field would.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */

import { reactive } from 'vue'
import { getDefaultContent } from '../components/CnWidgetGrid/dashboardWidgetRegistry.js'

/**
 * Create a widget-form state container.
 *
 * @return {{
 *   state: {type: string, content: object, editingWidget: (object|null)},
 *   resetForm: (type: string) => void,
 *   loadEditingWidget: (widget: object) => void,
 *   validate: (subFormRef: (object|null)) => string[],
 *   assembleContent: (subFormRef: (object|null)) => {type: string, content: object},
 * }} the form state plus its four management helpers.
 */
export function useWidgetForm() {
	// Vue.observable wraps the object so any component that touches
	// state.content / state.type re-renders on change, the same way a
	// data() field would.
	const state = reactive({
		type: '',
		content: {},
		editingWidget: null,
	})

	/**
	 * Drop the form back to defaults for `type`. Called when the modal opens in
	 * create mode and on every type-switch (no cross-type leakage).
	 *
	 * @param {string} type registry key for the widget type.
	 * @return {void}
	 */
	function resetForm(type) {
		state.type = type
		state.content = getDefaultContent(type)
		state.editingWidget = null
	}

	/**
	 * Pre-fill state from an existing placement so the modal opens in edit mode
	 * with all fields populated. Merges `widget.content` over the registry
	 * defaults so any field the registry adds in a future version still gets a
	 * sensible default when the persisted blob is missing it.
	 *
	 * @param {object} widget the placement being edited; must expose `type` and `content`.
	 * @return {void}
	 */
	function loadEditingWidget(widget) {
		if (!widget) {
			return
		}
		state.type = widget.type || ''
		const defaults = getDefaultContent(state.type)
		state.content = { ...defaults, ...(widget.content || {}) }
		state.editingWidget = widget
	}

	/**
	 * Ask the currently-mounted sub-form whether its inputs are valid. Returns
	 * an empty array when valid. When the sub-form ref is missing or doesn't
	 * expose a `validate()` method we default to the `['__no-active-form__']`
	 * sentinel so the modal stays in a safe disabled state during transient
	 * swaps (e.g. between a type-switch render and `nextTick`).
	 *
	 * @param {{validate?: () => string[]}|null|undefined} subFormRef the active sub-form Vue instance (via `<component :is ref="...">`).
	 * @return {string[]} validation error messages, empty when valid.
	 */
	function validate(subFormRef) {
		if (!subFormRef || typeof subFormRef.validate !== 'function') {
			return ['__no-active-form__']
		}
		const errors = subFormRef.validate()
		return Array.isArray(errors) ? errors : []
	}

	/**
	 * Build the `{type, content}` payload the modal emits via `submit`.
	 *
	 * Sub-forms expose their content one of two ways:
	 *  1. Imperatively via an `assembledContent` getter.
	 *  2. Reactively via `@update:content` events into `state.content`.
	 *
	 * We prefer (1) when present and fall back to (2) so per-widget capabilities
	 * can pick whichever style fits their fields better.
	 *
	 * @param {{assembledContent?: object}|null|undefined} subFormRef the active sub-form Vue instance.
	 * @return {{type: string, content: object}} payload for the `submit` event.
	 */
	function assembleContent(subFormRef) {
		const content = subFormRef && subFormRef.assembledContent
			? { ...subFormRef.assembledContent }
			: { ...state.content }
		return { type: state.type, content }
	}

	return {
		state,
		resetForm,
		loadEditingWidget,
		validate,
		assembleContent,
	}
}
