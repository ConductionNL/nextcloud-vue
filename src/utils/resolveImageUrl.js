/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { generateUrl } from '@nextcloud/router'

/**
 * Resolve an image URL for use as an `<img src>` at render time.
 *
 * **Contract:** the ONLY shape that gets resolved is a leading-slash,
 * un-webrooted app path — `/apps/<app>/…` — exactly what the backend returns
 * (e.g. `/apps/launchpad/resource/<name>`). Such a path omits the webroot and
 * `/index.php`, so it 404s on instances that route through `index.php`; it is
 * passed through `generateUrl()`, which prepends the correct webroot +
 * `/index.php`. Producers MUST return this shape for resolution to apply.
 *
 * Every other shape is returned UNCHANGED, deliberately:
 * - external URLs (`http(s)://`), protocol-relative (`//`), `data:`, `blob:` —
 *   not app resources, so nothing to resolve;
 * - already-resolved / webrooted paths (`/index.php/apps/…`, `/<webroot>/apps/…`)
 *   — re-running `generateUrl()` would double-prefix them;
 * - a bare `apps/…` with no leading slash — treated as opaque; producers are
 *   required to include the leading slash.
 *
 * Resolve only at display time; keep the logical `/apps/...` path in stored
 * content so routing is never persisted.
 *
 * @param {string} url the stored/entered image URL (a backend resource path
 *   MUST be a leading-slash `/apps/…` path to be resolved).
 * @return {string} the URL to use as an image source.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export function resolveImageUrl(url) {
	// Only the leading-slash `/apps/…` backend shape is resolved; see the
	// docblock for why every other shape is intentionally passed through.
	if (typeof url === 'string' && url.startsWith('/apps/')) {
		return generateUrl(url)
	}
	return url
}
