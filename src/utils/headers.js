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
 * Two call shapes are supported:
 *
 *   1. **Positional (back-compat)** — `buildHeaders(contentType)`.
 *      Returns the same object the v1 signature did.
 *
 *   2. **Options object** — `buildHeaders({ contentType?, organisationUuid?, targetLanguage? })`.
 *      When `organisationUuid` is a non-empty string the returned object
 *      includes `X-OpenRegister-Organisation: <uuid>`. The header is the
 *      FE side of the `multi-tenancy-context` capability and is consumed
 *      by OR's MultiTenancyTrait.
 *      When `targetLanguage` is a non-empty BCP-47 string the returned
 *      object includes `X-Translation-Target-Language: <bcp47>`. The
 *      header is the FE side of the `i18n-source-of-truth` write
 *      contract — OR stamps the value into `_translations[<bcp47>]`
 *      instead of overwriting the source row. See the
 *      `i18n-language-negotiation-getters` change.
 *
 * @param {string|object} [opts] Content-Type string (back-compat) or options object.
 * @param {string} [opts.contentType] Content-Type header value
 * @param {string} [opts.organisationUuid] Active organisation UUID for the request
 * @param {string} [opts.targetLanguage] BCP-47 target language for translation writes
 * @return {object} Headers object for use with fetch()
 */
export function buildHeaders(opts = 'application/json') {
	let contentType = 'application/json'
	let organisationUuid = null
	let targetLanguage = null

	if (typeof opts === 'string') {
		// v1 positional signature: buildHeaders(contentType)
		contentType = opts
	} else if (opts === null) {
		// v1 positional signature: buildHeaders(null) — explicit "no Content-Type"
		contentType = null
	} else if (opts && typeof opts === 'object') {
		// Options-object signature
		if (Object.prototype.hasOwnProperty.call(opts, 'contentType')) {
			contentType = opts.contentType
		}
		if (typeof opts.organisationUuid === 'string' && opts.organisationUuid.length > 0) {
			organisationUuid = opts.organisationUuid
		}
		if (typeof opts.targetLanguage === 'string' && opts.targetLanguage.length > 0) {
			targetLanguage = opts.targetLanguage
		}
	}

	const headers = {
		requesttoken: typeof OC !== 'undefined' ? OC.requestToken : '',
		'OCS-APIREQUEST': 'true',
	}
	if (contentType) {
		headers['Content-Type'] = contentType
	}
	if (organisationUuid) {
		headers['X-OpenRegister-Organisation'] = organisationUuid
	}
	if (targetLanguage) {
		headers['X-Translation-Target-Language'] = targetLanguage
	}
	return headers
}

/**
 * Capitalize the first letter of a string.
 *
 * @param {string} str Input string
 * @return {string} Capitalized string
 */
export function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Build a query string from a params object.
 *
 * Array values are serialized with PHP bracket notation (`key[]=a&key[]=b`)
 * so the Nextcloud/OpenRegister backend parses them as an array — a plain
 * repeated `key=a&key=b` collapses to the last value in PHP. Also handles
 * _order serialization (JSON.stringify for objects) and skips
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
			// PHP needs `key[]` to receive repeated params as an array;
			// without the brackets only the last value survives server-side.
			const arrayKey = key.endsWith('[]') ? key : `${key}[]`
			for (const item of value) {
				if (item !== undefined && item !== null && item !== '') {
					queryParams.append(arrayKey, String(item))
				}
			}
		} else if (typeof value === 'object') {
			queryParams.set(key, JSON.stringify(value))
		} else {
			queryParams.set(key, String(value))
		}
	}

	const str = queryParams.toString()
	return str ? '?' + str : ''
}
