/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The app's feature toggles on the client: the manifest declares them
 * (`features: [{ key, label, description?, default, failMode? }]`) and the
 * server hands the merged map as initial state `features` (OpenRegister's
 * FeatureToggleService, feature-toggle-surface D-3). `visibleIf.feature` and
 * `visibleWhen.feature` read it through {@link featureEnabled}.
 *
 * @module utils/featureFlags
 * @spec openspec/changes/feature-toggles/specs/feature-toggles/spec.md
 */

import { reactive } from 'vue'

const state = reactive({ declared: {}, values: null })

/**
 * Set the declarations and the server's merged map.
 *
 * @param {{declarations?: Array<object>, values?: (object|null)}} flags The manifest `features` and the initial-state map (null when the server served none).
 */
export function setFeatureFlags({ declarations = [], values = null } = {}) {
	const declared = {}
	for (const entry of Array.isArray(declarations) ? declarations : []) {
		if (entry && typeof entry.key === 'string' && entry.key !== '') {
			declared[entry.key] = { default: entry.default === true, failMode: entry.failMode === 'open' || entry.failMode === 'closed' ? entry.failMode : null }
		}
	}
	state.declared = declared
	state.values = values && typeof values === 'object' && !Array.isArray(values) ? { ...values } : null
}

/**
 * Whether a feature is on. The server's value wins; without one the
 * declaration's `default`; with no map from the server at all, `failMode`
 * (`open` on, `closed` off) before the default. An undeclared key is off.
 *
 * @param {string} key The feature key.
 * @return {boolean}
 * @spec openspec/changes/feature-toggles/specs/feature-toggles/spec.md#requirement-a-page-widget-or-action-can-follow-a-feature-toggle
 */
export function featureEnabled(key) {
	const declared = state.declared[key]
	if (!declared) {
		return false
	}
	if (state.values === null) {
		return declared.failMode === 'open' ? true : (declared.failMode === 'closed' ? false : declared.default)
	}
	const value = state.values[key]
	if (typeof value === 'boolean') {
		return value
	}
	if (value === 'true' || value === 'false') {
		return value === 'true'
	}
	return declared.default
}
