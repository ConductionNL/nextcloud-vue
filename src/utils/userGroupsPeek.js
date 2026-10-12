/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The synchronous, reactive read of the current user's group ids, without
 * the request that loads them.
 *
 * `resolveFilterTokens` (and through it `visibleWhen`) needs the groups for
 * `@myGroups`, and those utilities are used on public, signed-out pages too.
 * Importing `widgetVisibility.js` statically pulled `@nextcloud/axios` and
 * `@nextcloud/router` into every bundle that resolves a filter token: a public
 * site bundle broke its size budget, and node specs crashed because axios
 * reads the request token when it is imported. This module imports no
 * `@nextcloud/*` package. It loads `widgetVisibility.js` lazily, only the
 * first time a signed-in user's groups are actually peeked.
 *
 * @module utils/userGroupsPeek
 */

import { reactive } from 'vue'

/**
 * Reactive mirror of the group cache, keyed by user id. A computed that reads
 * a missing key tracks it, so it re-runs when the groups arrive.
 *
 * @type {{ byUser: Record<string, string[]> }}
 */
const _peek = reactive({ byUser: {} })

/** User ids whose groups a peek already asked for (not reactive on purpose). */
const _peekRequested = new Set()

/**
 * Get the current Nextcloud user ID from OC.currentUser.
 *
 * @return {string|null} The current user ID, or null if not logged in
 */
export function getCurrentUserId() {
	return window.OC?.currentUser?.uid
		|| window.OC?.currentUser
		|| null
}

/**
 * Synchronous, reactive read of the current user's group ids, for code that
 * cannot await (the `@myGroups` filter token). Returns the ids once they are
 * loaded, `null` while the first request is in flight (and starts that
 * request on first use), and `[]` when nobody is signed in. Read inside a
 * computed, the computed re-runs when the groups arrive.
 *
 * @spec openspec/changes/nextcloud-group-surfaces/specs/schema-utilities/spec.md#requirement-mygroups-resolves-to-the-current-users-group-ids
 * @return {string[]|null} The group ids, or null while loading.
 */
export function peekCurrentUserGroups() {
	const userId = getCurrentUserId()
	if (!userId) {
		return []
	}
	const known = _peek.byUser[userId]
	if (Array.isArray(known)) {
		return known
	}
	if (!_peekRequested.has(userId)) {
		_peekRequested.add(userId)
		import('./widgetVisibility.js')
			.then((module) => module.getCurrentUserGroups())
			.then((groups) => {
				_peek.byUser[userId] = Array.isArray(groups) ? [...groups] : []
			})
			.catch(() => {
				_peek.byUser[userId] = []
			})
	}
	return null
}

/**
 * Forget every peeked group list. `resetVisibilityCache()` calls this.
 *
 * @spec exclude test helper behind resetVisibilityCache, no behaviour of its own
 */
export function resetGroupsPeek() {
	_peekRequested.clear()
	for (const key of Object.keys(_peek.byUser)) {
		delete _peek.byUser[key]
	}
}
