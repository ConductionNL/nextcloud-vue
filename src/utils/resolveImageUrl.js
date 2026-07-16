/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { generateUrl } from '@nextcloud/router'

/**
 * Resolve an image URL for use as an `<img src>` at render time.
 *
 * App-relative resource paths returned by the backend (e.g.
 * `/apps/launchpad/resource/<name>`) omit the webroot and `/index.php`, so they
 * 404 on instances that route through `index.php`. Such paths are passed through
 * `generateUrl()` so they carry the correct prefix. Everything else — external
 * URLs (`http(s)://`), protocol-relative (`//`), and inline `data:` / `blob:`
 * URLs — is returned untouched.
 *
 * Resolve only at display time; keep the logical `/apps/...` path in stored
 * content so routing is never persisted.
 *
 * @param {string} url the stored/entered image URL.
 * @return {string} the URL to use as an image source.
 */
export function resolveImageUrl(url) {
	if (typeof url === 'string' && url.startsWith('/apps/')) {
		return generateUrl(url)
	}
	return url
}
