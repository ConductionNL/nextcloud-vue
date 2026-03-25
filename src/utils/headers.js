/**
 * Prepend `/index.php` to a URL path when the current page is served via index.php.
 * Unless the given path already contains `/index.php`.
 *
 * Nextcloud can be hosted with or without index.php in the URL. API calls must
 * use the same prefix as the page, otherwise the request is rejected.
 *
 * @param {string} path URL path (e.g. '/apps/openregister/api/objects')
 * @return {string} Path with optional /index.php prefix
 */
export function prefixUrl(path) {
	if (path.startsWith('/index.php')) return path
	if (typeof window !== 'undefined' && window.location.pathname.includes('/index.php')) {
		return `/index.php${path}`
	}
	return path
}

/**
 * Build standard Nextcloud request headers for API calls.
 *
 * Includes the CSRF request token and OCS API request header
 * required by Nextcloud's API layer.
 *
 * @param {string} [contentType] Content-Type header value
 * @return {object} Headers object for use with fetch()
 */
export function buildHeaders(contentType = 'application/json') {
	const headers = {
		requesttoken: OC.requestToken,
		'OCS-APIREQUEST': 'true',
	}
	if (contentType) {
		headers['Content-Type'] = contentType
	}
	return headers
}

/**
 * Build a query string from a params object.
 *
 * Handles _order serialization (JSON.stringify for objects) and skips
 * null/undefined/empty values.
 *
 * @param {object} params Key-value pairs for query parameters
 * @return {string} Query string including leading '?' or empty string
 */
export function buildQueryString(params = {}) {
	const queryParams = new URLSearchParams()

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') continue
		if (Array.isArray(value) && value.length === 0) continue
		if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item !== undefined && item !== null && item !== '') {
					queryParams.append(key, String(item))
				}
			}
		} else if (key === '_order' && typeof value === 'object') {
			queryParams.set(key, JSON.stringify(value))
		} else {
			queryParams.set(key, String(value))
		}
	}

	const str = queryParams.toString()
	return str ? '?' + str : ''
}
