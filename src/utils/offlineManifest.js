/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pure readers of a manifest's `offline` block (manifest-offline-block).
 *
 * The validator, the take-along downloader, the pages and CnAppRoot all need
 * the same answers: which register a take-along entry means when it names
 * none, what its limit and lifetime are when left out, which form pages are
 * offline forms and which register and schema they write. Keeping them here,
 * free of Dexie and axios, lets every one of them agree and keeps the
 * validator cheap to import in Node.
 *
 * @module utils/offlineManifest
 */

/** Records downloaded per take-along entry when `limit` is left out. */
export const DEFAULT_TAKE_ALONG_LIMIT = 100

/** Hours a take-along set stays usable when `ttlHours` is left out. */
export const DEFAULT_TAKE_ALONG_TTL_HOURS = 24

/**
 * Whether a value is a non-empty string.
 *
 * @param {unknown} value The value.
 * @return {boolean} True for a non-empty string.
 */
function filled(value) {
	return typeof value === 'string' && value !== ''
}

/**
 * The page's config as a plain object (an empty config can arrive as `[]`).
 *
 * @param {object} page A manifest page.
 * @return {object} The config, or an empty object.
 */
function configOf(page) {
	const config = page && page.config
	return config && typeof config === 'object' && !Array.isArray(config) ? config : {}
}

/**
 * Whether the manifest declares an `offline` block at all.
 *
 * A page whose manifest has none never opens the offline database.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-index-and-detail-pages-read-from-the-device-when-offline
 * @param {object|null} manifest The manifest.
 * @return {boolean} True when `manifest.offline` is an object.
 */
export function hasOfflineBlock(manifest) {
	const offline = manifest && manifest.offline
	return Boolean(offline && typeof offline === 'object' && !Array.isArray(offline))
}

/**
 * Map each schema slug to the registers that pages bind it in.
 *
 * Only literal strings count: a `@`-token register is not a register yet.
 *
 * @param {object|null} manifest The manifest.
 * @return {Map<string, Set<string>>} schema → registers.
 */
export function registersBySchema(manifest) {
	const map = new Map()
	const pages = manifest && Array.isArray(manifest.pages) ? manifest.pages : []
	for (const page of pages) {
		const config = configOf(page)
		if (!filled(config.register) || !filled(config.schema) || config.register.startsWith('@') || config.schema.startsWith('@')) {
			continue
		}
		if (!map.has(config.schema)) {
			map.set(config.schema, new Set())
		}
		map.get(config.schema).add(config.register)
	}
	return map
}

/**
 * The take-along entries with their register resolved and defaults applied.
 *
 * An entry without `register` takes the one register its schema is bound in;
 * when there is none or more than one it keeps an empty register (the
 * validator refuses that manifest, and the downloader skips the entry).
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-manifest-declares-what-goes-offline
 * @param {object|null} manifest The manifest.
 * @return {Array<{register: string, schema: string, filter: object, limit: number, ttlHours: number}>} The entries.
 */
export function takeAlongEntries(manifest) {
	if (!hasOfflineBlock(manifest) || !Array.isArray(manifest.offline.takeAlong)) {
		return []
	}
	const bound = registersBySchema(manifest)
	return manifest.offline.takeAlong
		.filter((entry) => entry && filled(entry.schema))
		.map((entry) => {
			let register = filled(entry.register) ? entry.register : ''
			if (register === '') {
				const registers = bound.get(entry.schema)
				register = registers && registers.size === 1 ? [...registers][0] : ''
			}
			return {
				register,
				schema: entry.schema,
				filter: entry.filter && typeof entry.filter === 'object' && !Array.isArray(entry.filter) ? entry.filter : {},
				limit: Number.isInteger(entry.limit) ? entry.limit : DEFAULT_TAKE_ALONG_LIMIT,
				ttlHours: Number.isInteger(entry.ttlHours) ? entry.ttlHours : DEFAULT_TAKE_ALONG_TTL_HOURS,
			}
		})
}

/**
 * The take-along entry for one register and schema, or null.
 *
 * @param {object|null} manifest The manifest.
 * @param {string} register Register slug.
 * @param {string} schema Schema slug.
 * @return {object|null} The resolved entry.
 */
export function takeAlongFor(manifest, register, schema) {
	return takeAlongEntries(manifest).find((entry) => entry.register === register && entry.schema === schema) || null
}

/**
 * Whether a submit endpoint is the object URL of a register and schema.
 *
 * Accepted: `/apps/openregister/api/objects/{register}/{schema}`, with or
 * without `/index.php` in front, and with an `/:id` (or `/{id}`) segment for
 * an edit form.
 *
 * @param {string} endpoint The endpoint.
 * @param {string} register Register slug.
 * @param {string} schema Schema slug.
 * @return {boolean} True when it is that schema's object URL.
 */
export function isObjectUrlFor(endpoint, register, schema) {
	if (!filled(endpoint)) {
		return false
	}
	const path = endpoint.replace(/^\/index\.php/, '').replace(/\/+$/, '')
	const base = `/apps/openregister/api/objects/${register}/${schema}`
	if (path === base) {
		return true
	}
	return path.startsWith(`${base}/`) && /^(:[A-Za-z_]\w*|\{[A-Za-z_]\w*\})$/.test(path.slice(base.length + 1))
}

/**
 * The offline forms: listed `type: form` pages that declare a register and
 * schema. Pages the validator would refuse are left out, so a broken
 * manifest never queues anything.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-an-offline-form-queues-its-submission-and-the-root-sends-it
 * @param {object|null} manifest The manifest.
 * @return {Array<{id: string, register: string, schema: string}>} The offline forms.
 */
export function offlineForms(manifest) {
	if (!hasOfflineBlock(manifest) || !Array.isArray(manifest.offline.forms)) {
		return []
	}
	const pages = Array.isArray(manifest.pages) ? manifest.pages : []
	const forms = []
	for (const id of manifest.offline.forms) {
		const page = pages.find((p) => p && p.id === id)
		if (!page || page.type !== 'form' || offlineFormProblem(page) !== null) {
			continue
		}
		const config = configOf(page)
		forms.push({ id, register: config.register, schema: config.schema })
	}
	return forms
}

/**
 * Why a form page cannot be an offline form, or null when it can.
 *
 * An offline form's queued submission is replayed against the object API,
 * so it must name the register and schema it writes, use no handler (code
 * the queue cannot replay) and post nowhere but that schema's object URL.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-manifest-declares-what-goes-offline
 * @param {object} page A `type: form` page.
 * @return {string|null} The reason, or null.
 */
export function offlineFormProblem(page) {
	const config = configOf(page)
	if (!filled(config.register) || !filled(config.schema)) {
		return 'declares no config.register and config.schema'
	}
	if (filled(config.submitHandler)) {
		return `submits through submitHandler "${config.submitHandler}", which the queue cannot replay`
	}
	if (filled(config.submitEndpoint) && !isObjectUrlFor(config.submitEndpoint, config.register, config.schema)) {
		return `submits to "${config.submitEndpoint}", which is not the object URL of ${config.register}/${config.schema}`
	}
	return null
}
