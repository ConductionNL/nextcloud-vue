/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import axios from '@nextcloud/axios'

/**
 * Stop the app's `@nextcloud/axios` client from reading an `XSRF-TOKEN` cookie.
 *
 * axios 1.21 reads that cookie through the async `window.cookieStore.get()`
 * before every same-origin request and only calls `send()` once it answers,
 * which costs 100-400 ms per request during a Chrome page load. Nextcloud
 * never sets that cookie (it sends the `requesttoken` header), so the read is
 * pure waiting. Idempotent; leaves an explicit app setting alone.
 *
 * @return {boolean} Whether the client now skips the cookie read.
 */
export function applyAxiosDefaults() {
	const defaults = axios && axios.defaults
	if (!defaults || typeof defaults !== 'object') {
		return false
	}
	if (defaults.withXSRFToken === undefined || defaults.withXSRFToken === null) {
		defaults.withXSRFToken = false
	}
	return defaults.withXSRFToken === false
}
