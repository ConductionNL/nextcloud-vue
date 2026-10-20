/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Modals every app can open by name with an `open-modal` action, without
 * registering them. An app's own registry entry of the same name wins.
 *
 * @module utils/builtInModals
 */

import { defineAsyncComponent } from 'vue'

/**
 * The built-in modals, as registry entries (`{ kind: 'modal', component }`):
 * `CnActionDialog`, the generic summary, checklist, reason and confirm dialog,
 * and `CnAssignDialog`, hand a record to another user or team; each takes its
 * `config` in the action's `props`. Loaded on first open.
 *
 * @type {Readonly<Record<string, {kind: string, component: object}>>}
 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
 */
export const BUILT_IN_MODALS = Object.freeze({
	CnActionDialog: { kind: 'modal', component: defineAsyncComponent(() => import('../components/CnActionDialog/CnActionDialog.vue')) },
	CnAssignDialog: { kind: 'modal', component: defineAsyncComponent(() => import('../components/CnAssignDialog/CnAssignDialog.vue')) },
})

/**
 * The registry entry for a modal name: the app's own, else a built-in one.
 *
 * @param {object|null} registry The app's registry.
 * @param {string} name The modal's name.
 * @return {object|null} The entry, or null.
 */
export function resolveModalEntry(registry, name) {
	const own = registry && typeof registry === 'object' ? registry[name] : undefined
	return own || BUILT_IN_MODALS[name] || null
}
