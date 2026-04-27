import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import schema from '../schemas/app-manifest.schema.json'

/**
 * Composable that loads and validates a Conduction app manifest.
 *
 * The composable implements the three-phase flow specified in
 * REQ-JMR-002 of the json-manifest-renderer capability:
 *
 *  1. Synchronous bundled load — `bundledManifest` is the immediate value.
 *  2. Async backend merge — fetches `/index.php/apps/{appId}/api/manifest`
 *     and deep-merges any 200 response over the bundled manifest. 4xx /
 *     5xx / network errors are silently ignored so apps work without a
 *     backend endpoint.
 *  3. Validation — the merged result is validated against
 *     `app-manifest.schema.json`. On failure, the bundled manifest is
 *     kept and a `console.warn` is emitted with the error list.
 *
 * The returned manifest is reactive, so the future "app builder" backend
 * can hot-swap the manifest without a page reload.
 *
 * @param {string} appId Nextcloud app ID. Used to build the default
 *   backend endpoint URL via `@nextcloud/router`.
 * @param {object} bundledManifest The manifest shipped with the app (the
 *   default value, available synchronously).
 * @param {object} [options] Configuration options.
 * @param {string} [options.endpoint] Override the backend fetch URL.
 *   Useful for tests and alternative-host deployments.
 * @param {Function} [options.fetcher] Override the fetch function. Must
 *   return a promise resolving to `{ status: number, data: object }`.
 *   Defaults to `axios.get` from `@nextcloud/axios` (which inherits the
 *   Nextcloud CSRF token automatically).
 * @return {{ manifest: import('vue').Ref<object>, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null> }}
 *
 * @example Basic usage (Composition API)
 * const { manifest, isLoading } = useAppManifest('decidesk', bundled)
 *
 * @example Inside an Options API component
 * export default {
 *   setup() {
 *     return useAppManifest('decidesk', bundled)
 *   },
 * }
 *
 * @example Custom endpoint and fetcher (e.g. for tests)
 * useAppManifest('decidesk', bundled, {
 *   endpoint: '/custom/manifest/url',
 *   fetcher: (url) => Promise.resolve({ status: 200, data: { ... } }),
 * })
 */
export function useAppManifest(appId, bundledManifest, options = {}) {
	const manifest = ref(bundledManifest)
	const isLoading = ref(true)
	const validationErrors = ref(null)

	const endpoint = options.endpoint ?? generateUrl(`/apps/${appId}/api/manifest`)
	const fetcher = options.fetcher ?? ((url) => axios.get(url))

	;(async () => {
		try {
			const response = await fetcher(endpoint)
			if (!response || response.status !== 200 || !response.data) {
				return
			}
			const merged = deepMerge(bundledManifest, response.data)
			const result = validateManifest(merged)
			if (!result.valid) {
				validationErrors.value = result.errors
				// eslint-disable-next-line no-console
				console.warn(
					'[useAppManifest] Backend manifest failed schema validation; falling back to bundled manifest.',
					result.errors,
				)
				return
			}
			manifest.value = merged
		} catch (err) {
			// Silent fallback on 404, network errors, non-200 responses.
			// Apps without a backend endpoint should keep working.
		} finally {
			isLoading.value = false
		}
	})()

	return { manifest, isLoading, validationErrors }
}

/**
 * Deep-merge `source` into `target`, returning a new object. Plain
 * objects are merged recursively; arrays are replaced (not concatenated)
 * to match typical deep-merge semantics expected by manifest overrides.
 *
 * @param {object} target Base object.
 * @param {object} source Object whose values take precedence.
 * @return {object} New merged object.
 */
function deepMerge(target, source) {
	if (!isPlainObject(target)) return source
	if (!isPlainObject(source)) return source
	const out = { ...target }
	for (const key of Object.keys(source)) {
		if (isPlainObject(source[key]) && isPlainObject(target[key])) {
			out[key] = deepMerge(target[key], source[key])
		} else {
			out[key] = source[key]
		}
	}
	return out
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Validate a manifest against the manifest JSON Schema. Hand-rolled
 * minimal validator covering the rules required by REQ-JMR-001:
 *  - Top-level `version`, `menu`, `pages` are required.
 *  - `version` matches the semver pattern.
 *  - `pages[].type` is in the closed enum.
 *  - `pages[].id` is unique across the array.
 *  - Required fields on menu items and pages are present.
 *
 * The richer schema constraints (additionalProperties, format URI, etc.)
 * are enforced by the BE / hydra CI validators that consume the same
 * schema file with Ajv. The FE validator is intentionally narrow so that
 * a FE-only check failure has a tight, actionable error message.
 *
 * @param {object} manifest The merged manifest to validate.
 * @return {{ valid: boolean, errors: string[] }}
 */
function validateManifest(manifest) {
	const errors = []

	if (!isPlainObject(manifest)) {
		return { valid: false, errors: ['manifest must be an object'] }
	}

	const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

	if (typeof manifest.version !== 'string') {
		errors.push('/version must be a string')
	} else if (!versionPattern.test(manifest.version)) {
		errors.push(`/version "${manifest.version}" must match semver pattern`)
	}

	if (!Array.isArray(manifest.menu)) {
		errors.push('/menu must be an array')
	} else {
		manifest.menu.forEach((item, index) => {
			if (!isPlainObject(item)) {
				errors.push(`/menu/${index} must be an object`)
				return
			}
			if (typeof item.id !== 'string') errors.push(`/menu/${index}/id must be a string`)
			if (typeof item.label !== 'string') errors.push(`/menu/${index}/label must be a string`)
			if (item.children !== undefined && !Array.isArray(item.children)) {
				errors.push(`/menu/${index}/children must be an array`)
			}
		})
	}

	const allowedTypes = schema.$defs.page.properties.type.enum

	if (!Array.isArray(manifest.pages)) {
		errors.push('/pages must be an array')
	} else {
		const seenIds = new Set()
		manifest.pages.forEach((page, index) => {
			if (!isPlainObject(page)) {
				errors.push(`/pages/${index} must be an object`)
				return
			}
			if (typeof page.id !== 'string') {
				errors.push(`/pages/${index}/id must be a string`)
			} else if (seenIds.has(page.id)) {
				errors.push(`/pages/${index}/id "${page.id}" must be unique within pages[]`)
			} else {
				seenIds.add(page.id)
			}
			if (typeof page.route !== 'string') errors.push(`/pages/${index}/route must be a string`)
			if (typeof page.title !== 'string') errors.push(`/pages/${index}/title must be a string`)
			if (typeof page.type !== 'string' || !allowedTypes.includes(page.type)) {
				errors.push(`/pages/${index}/type must be one of: ${allowedTypes.join(', ')}`)
			}
			if (page.type === 'custom' && typeof page.component !== 'string') {
				errors.push(`/pages/${index}/component is required when type is "custom"`)
			}
		})
	}

	if (manifest.dependencies !== undefined) {
		if (!Array.isArray(manifest.dependencies)) {
			errors.push('/dependencies must be an array of strings')
		} else {
			manifest.dependencies.forEach((dep, index) => {
				if (typeof dep !== 'string') {
					errors.push(`/dependencies/${index} must be a string`)
				}
			})
		}
	}

	return { valid: errors.length === 0, errors }
}
