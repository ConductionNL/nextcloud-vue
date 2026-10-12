/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * objectWrite: the one-object PATCH the settings widgets share.
 *
 * @module utils/objectWrite
 */

import { prefixUrl } from './headers.js'

/**
 * The OpenRegister URL of one object, or '' when register, schema or id is missing.
 *
 * @param {string|object} register Register slug.
 * @param {string|object} schema Schema slug.
 * @param {string|number} id Object id.
 * @return {string} The object URL.
 */
export function objectUrlOf(register, schema, id) {
	if (typeof register !== 'string' || typeof schema !== 'string' || !register || !schema || id === undefined || id === null || id === '') {
		return ''
	}
	return `/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(String(id))}`
}

/**
 * PATCH only the given fields of one object.
 *
 * @param {string} url The object URL (see objectUrlOf).
 * @param {object} patch The fields to write.
 * @return {Promise<object>} The object the server answered with.
 */
export async function patchObject(url, patch) {
	const { default: axios } = await import('@nextcloud/axios')
	const { data } = await axios.patch(prefixUrl(url), patch)
	return data && typeof data === 'object' ? data : {}
}

/**
 * The fields of `next` that differ from `base`, compared by value.
 *
 * @param {object} base What the server last held.
 * @param {object} next What the form holds.
 * @return {object} The changed fields only.
 */
export function changedFields(base, next) {
	const patch = {}
	for (const [key, value] of Object.entries(next)) {
		if (JSON.stringify(value === undefined ? null : value) !== JSON.stringify(base[key] === undefined ? null : base[key])) {
			patch[key] = value
		}
	}
	return patch
}

/**
 * Set a dot-path on a copy of an object, creating the objects on the way.
 *
 * @param {object} base The object to copy.
 * @param {string} path Dot-path (`'a.b.c'`).
 * @param {unknown} value The leaf value.
 * @return {object} A new object with the leaf set; `base` is untouched.
 */
export function setPath(base, path, value) {
	const segments = String(path).split('.')
	const root = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {}
	let cursor = root
	for (let index = 0; index < segments.length - 1; index++) {
		const child = cursor[segments[index]]
		cursor[segments[index]] = child && typeof child === 'object' && !Array.isArray(child) ? { ...child } : {}
		cursor = cursor[segments[index]]
	}
	cursor[segments[segments.length - 1]] = value
	return root
}

/**
 * Turn `{ 'a.b': 1, 'a.c': 2, d: 3 }` into `{ a: { b: 1, c: 2 }, d: 3 }`.
 *
 * @param {object} changes Changed values by field path.
 * @return {object} The nested object.
 */
export function nestChanges(changes) {
	let nested = {}
	for (const [path, value] of Object.entries(changes)) {
		nested = setPath(nested, path, value)
	}
	return nested
}

/**
 * Fill the tokens of a `save` template. A string that is exactly one token
 * takes the token's typed value; a token inside a longer string is written as
 * text. Tokens: `{value}` (the one changed value), `{field}` (its path),
 * `{changes}` (every changed value as a nested object) and `{object.<path>}`
 * (a field of the current object).
 *
 * @param {unknown} template A string, array or object holding tokens.
 * @param {object} scope `{ value, field, changes, object }`.
 * @return {unknown} The template with its tokens filled.
 */
export function fillSaveTemplate(template, scope) {
	const lookup = (name) => {
		if (name === 'value') {
			return scope.value
		}
		if (name === 'field') {
			return scope.field
		}
		if (name === 'changes') {
			return scope.changes
		}
		if (name.startsWith('object.')) {
			return name.slice(7).split('.').reduce((cursor, key) => (cursor === null || cursor === undefined ? cursor : cursor[key]), scope.object || {})
		}
		return undefined
	}
	if (typeof template === 'string') {
		const whole = /^\{(value|field|changes|object\.[^{}]+)\}$/.exec(template)
		if (whole) {
			const found = lookup(whole[1])
			return found === undefined ? null : found
		}
		return template.replace(/\{(value|field|changes|object\.[^{}]+)\}/g, (match, name) => {
			const found = lookup(name)
			return found === undefined || found === null ? '' : (typeof found === 'object' ? JSON.stringify(found) : String(found))
		})
	}
	if (Array.isArray(template)) {
		return template.map((item) => fillSaveTemplate(item, scope))
	}
	if (template && typeof template === 'object') {
		const filled = {}
		for (const [key, item] of Object.entries(template)) {
			filled[key] = fillSaveTemplate(item, scope)
		}
		return filled
	}
	return template
}

/**
 * Write changed fields. A field path may be nested (`'a.b.c'`): the smallest
 * enclosing top-level object is re-read from the server, the leaf is merged
 * into it and that whole top-level object is written, so a sibling changed
 * elsewhere in the meantime is kept. Top-level fields are written as they are,
 * with no re-read. Everything goes out as ONE PATCH.
 *
 * With a `save` config (`{ url, method?, payload? }`) the write goes to that
 * endpoint instead of the object: the url and the payload are templates, see
 * {@link fillSaveTemplate}; the payload defaults to `{changes}` and the method
 * to PATCH.
 *
 * @param {string} url The object URL (see objectUrlOf).
 * @param {object} changes The new values by field path.
 * @param {object} [options] Options.
 * @param {object} [options.save] The `save` config, when the app has its own endpoint.
 * @param {object} [options.object] The current object, for `{object.<path>}` tokens.
 * @return {Promise<object>} What the server answered.
 */
export async function writeFields(url, changes, options = {}) {
	const { save, object } = options
	if (save && typeof save === 'object' && save.url) {
		const keys = Object.keys(changes)
		const scope = { value: keys.length === 1 ? changes[keys[0]] : undefined, field: keys.length === 1 ? keys[0] : undefined, changes: nestChanges(changes), object }
		// A token in the address is one path segment: encoded, and never empty.
		const endpoint = String(save.url).replace(/\{(value|field|object\.[^{}]+)\}/g, (match) => {
			const found = fillSaveTemplate(match, scope)
			if (found === null || found === undefined || found === '' || typeof found === 'object') {
				throw new Error(`No value for ${match} in the save address.`)
			}
			return encodeURIComponent(String(found))
		})
		const method = String(save.method || 'PATCH').toLowerCase()
		const body = fillSaveTemplate(save.payload === undefined ? '{changes}' : save.payload, scope)
		const { default: axios } = await import('@nextcloud/axios')
		const { data } = await axios[['put', 'post', 'patch'].includes(method) ? method : 'patch'](prefixUrl(endpoint), body)
		return data && typeof data === 'object' ? data : {}
	}
	const nested = Object.keys(changes).some((path) => path.includes('.'))
	if (!nested) {
		return patchObject(url, changes)
	}
	const { default: axios } = await import('@nextcloud/axios')
	const { data: stored } = await axios.get(prefixUrl(url))
	const patch = {}
	for (const [path, value] of Object.entries(changes)) {
		const top = path.split('.')[0]
		const current = Object.hasOwn(patch, top) ? patch[top] : (stored || {})[top]
		patch[top] = path.includes('.') ? setPath({ [top]: current }, path, value)[top] : value
	}
	return patchObject(url, patch)
}
