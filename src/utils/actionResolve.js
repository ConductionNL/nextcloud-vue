/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * actionResolve: the record an action's `resolve` block names, such as the
 * programme's open cycle for a "Close cycle" button (board PqProject). The
 * first OpenRegister object of `register`/`schema` that matches `filter`
 * (whose values run the action token grammar, so `@objectId` is the page's
 * record) becomes `@resolved.<field>` in the action's url, target and payload.
 *
 * @module utils/actionResolve
 * @spec openspec/changes/screens-action-resolve/specs/manifest-actions/spec.md#requirement-an-action-can-name-a-looked-up-record
 */

import { fetchReferenceObjects } from './boardReferenceColumns.js'
import { dropOptionalUnresolved, hasUnresolvedTokens, resolveFilterTokens } from './resolveFilterTokens.js'

/**
 * Look up the record an action's `resolve` block names.
 *
 * @param {{register: string, schema: string, filter?: object}} resolve The action's `resolve` block.
 * @param {object} tokenCtx The token context the filter values resolve against.
 * @return {Promise<object|null>} The first matching record, or null when none matches, a required token is unresolved, or the lookup fails.
 * @spec openspec/changes/screens-action-resolve/specs/manifest-actions/spec.md#requirement-an-action-can-name-a-looked-up-record
 */
export async function resolveActionRecord(resolve, tokenCtx = {}) {
	if (!resolve || typeof resolve !== 'object' || !resolve.register || !resolve.schema) {
		return null
	}
	const resolved = resolveFilterTokens(resolve.filter || {}, tokenCtx)
	if (hasUnresolvedTokens(resolved)) {
		return null
	}
	try {
		const rows = await fetchReferenceObjects({
			register: resolve.register,
			schema: resolve.schema,
			filter: dropOptionalUnresolved(resolved),
			limit: 1,
		})
		return rows[0] || null
	} catch {
		return null
	}
}

/**
 * Whether an action looks a record up before it runs.
 *
 * @param {object} action The manifest action.
 * @return {boolean} True for an api-call or navigate action with a `resolve` block.
 * @spec openspec/changes/screens-action-resolve/specs/manifest-actions/spec.md#requirement-an-action-can-name-a-looked-up-record
 */
export function actionNeedsResolve(action) {
	return Boolean(action && action.resolve && typeof action.resolve === 'object'
		&& (action.type === 'api-call' || action.type === 'navigate'))
}
