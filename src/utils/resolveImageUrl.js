/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { generateUrl, imagePath } from '@nextcloud/router'

/**
 * Resolve an image URL for use as an `<img src>` at render time.
 *
 * **Contract:** exactly two shapes get resolved.
 *
 * - A leading-slash, un-webrooted app path — `/apps/<app>/…` — exactly what
 *   the backend returns (e.g. `/apps/launchpad/resource/<name>`). Such a path
 *   omits the webroot and `/index.php`, so it 404s on instances that route
 *   through `index.php`; it is passed through `generateUrl()`, which prepends
 *   the correct webroot + `/index.php`.
 * - An app image reference — `app:<app>/<file>` — naming a file in that
 *   app's own `img/` folder (e.g. `app:pipelinq/marketing/hero.svg`). Static
 *   app files are not routed through `index.php`, and where they are served
 *   from depends on which apps directory the app is installed in, so a stored
 *   path cannot name them; `imagePath()` resolves the install location at
 *   render time. This is how seed or demo data points at images the app
 *   ships.
 *
 * Producers MUST use one of these shapes for resolution to apply.
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
 *   MUST be a leading-slash `/apps/…` path, and an app image an
 *   `app:<app>/<file>` reference, to be resolved).
 * @return {string} the URL to use as an image source.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export function resolveImageUrl(url) {
	// Only the two documented shapes are resolved; see the docblock for why
	// every other shape is intentionally passed through.
	if (typeof url !== 'string') {
		return url
	}
	if (url.startsWith('/apps/')) {
		return generateUrl(url)
	}
	const appImage = /^app:([a-z0-9_-]+)\/(.+)$/i.exec(url)
	if (appImage) {
		return imagePath(appImage[1], appImage[2])
	}
	return url
}
