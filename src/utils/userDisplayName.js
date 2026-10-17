/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * userDisplayName: a user id's display name for synchronous text (a template
 * token), looked up once through `resolveNextcloudUser` and kept in a
 * reactive cache, so a computed that read it renders again when the name
 * arrives.
 *
 * @module utils/userDisplayName
 * @spec openspec/changes/screens-header-meta-tokens/specs/detail-page-board-look/spec.md#requirement-the-header-meta-line-formats-users-long-dates-and-enum-labels
 */

import { reactive } from 'vue'
import { resolveNextcloudUser } from './userAutocomplete.js'

const names = reactive({})

/**
 * The display name of a user id: the cached name, or '' while it is being
 * looked up (the first call starts the lookup). A user that cannot be
 * resolved reads as its id.
 *
 * @param {unknown} uid The user id.
 * @return {string} The display name, or '' while loading.
 * @spec openspec/changes/screens-header-meta-tokens/specs/detail-page-board-look/spec.md#requirement-the-header-meta-line-formats-users-long-dates-and-enum-labels
 */
export function userDisplayName(uid) {
	if (uid === null || uid === undefined || uid === '' || typeof uid === 'object') {
		return ''
	}
	const id = String(uid)
	if (typeof names[id] === 'string') {
		return names[id]
	}
	if (names[id] === undefined) {
		names[id] = null
		resolveNextcloudUser(id)
			.then((option) => { names[id] = option && option.label ? String(option.label) : id })
			.catch(() => { names[id] = id })
	}
	return ''
}

/**
 * Forget every cached name (tests).
 *
 * @return {void}
 */
export function clearUserDisplayNames() {
	for (const key of Object.keys(names)) {
		delete names[key]
	}
}
