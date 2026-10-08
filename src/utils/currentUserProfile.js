/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The signed-in user's display name and e-mail, for `@me.displayName` and
 * `@me.email` defaults. Asked for once per page load; a failure is `{}`.
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-2
 */
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

let cached = null

/**
 * @return {Promise<{displayName?: string, email?: string}>} The profile, or `{}` when it cannot be read.
 */
export function loadCurrentUserProfile() {
	if (cached === null) {
		cached = axios.get(generateOcsUrl('/cloud/user?format=json'))
			.then((response) => {
				const data = (response && response.data && response.data.ocs && response.data.ocs.data) || {}
				return { displayName: data.displayname || data['display-name'] || '', email: data.email || '' }
			})
			.catch(() => {
				cached = null
				return {}
			})
	}
	return cached
}

/** Forget the cached profile (tests). */
export function resetCurrentUserProfile() {
	cached = null
}
