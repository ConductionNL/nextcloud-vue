/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * openApiModel — turns an OpenAPI 3 document into what `CnApiReference`
 * shows. No Vue and no network: only references that start with `#/` are
 * resolved, anything else is marked external, and a cycle stops at its second
 * visit.
 *
 * @module utils/openApiModel
 * @spec openspec/changes/openapi-reference-component/tasks.md#task-1
 */

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

/**
 * What kind of document this is.
 *
 * @param {object|null} doc The parsed document.
 * @return {'3.0'|'3.1'|'swagger2'|'unknown'} The version family.
 */
export function detectOpenApiVersion(doc) {
	if (!doc || typeof doc !== 'object') {
		return 'unknown'
	}
	if (typeof doc.openapi === 'string') {
		if (doc.openapi.startsWith('3.0')) {
			return '3.0'
		}
		if (doc.openapi.startsWith('3.1')) {
			return '3.1'
		}
		return 'unknown'
	}
	if (String(doc.swagger) === '2.0') {
		return 'swagger2'
	}
	return 'unknown'
}

/**
 * Every call of the document, in document order.
 *
 * @param {object} doc The OpenAPI 3 document.
 * @return {Array<{id: string, method: string, path: string, summary: string, tag: string, operation: object, pathItem: object}>} The calls.
 */
export function listOperations(doc) {
	const out = []
	const paths = doc && typeof doc.paths === 'object' && doc.paths ? doc.paths : {}
	for (const [path, pathItem] of Object.entries(paths)) {
		if (!pathItem || typeof pathItem !== 'object') {
			continue
		}
		for (const method of METHODS) {
			const operation = pathItem[method]
			if (!operation || typeof operation !== 'object') {
				continue
			}
			const tag = Array.isArray(operation.tags) && operation.tags.length > 0 ? String(operation.tags[0]) : ''
			out.push({
				id: `${method}:${path}`,
				method: method.toUpperCase(),
				path,
				summary: String(operation.summary || ''),
				tag,
				operation,
				pathItem,
			})
		}
	}
	return out
}

/**
 * Group calls by their first tag, in first-seen order; untagged calls go last
 * under `otherLabel`.
 *
 * @param {Array<object>} operations The calls from {@link listOperations}.
 * @param {string} [otherLabel] The group name for untagged calls.
 * @return {Array<{tag: string, operations: object[]}>} The groups.
 */
export function groupByTag(operations, otherLabel = 'Other') {
	const groups = new Map()
	const other = []
	for (const op of operations) {
		if (op.tag === '') {
			other.push(op)
			continue
		}
		if (!groups.has(op.tag)) {
			groups.set(op.tag, [])
		}
		groups.get(op.tag).push(op)
	}
	const result = [...groups.entries()].map(([tag, ops]) => ({ tag, operations: ops }))
	if (other.length > 0) {
		result.push({ tag: otherLabel, operations: other })
	}
	return result
}

/**
 * Narrow calls by path, method or summary (case-insensitive substring).
 *
 * @param {Array<object>} operations The calls.
 * @param {string} query The reader's filter text.
 * @return {Array<object>} The matching calls.
 */
export function filterOperations(operations, query) {
	const q = String(query || '').trim().toLowerCase()
	if (q === '') {
		return operations
	}
	return operations.filter((op) => `${op.method} ${op.path} ${op.summary}`.toLowerCase().includes(q))
}

/**
 * Follow a local `#/` reference.
 *
 * @param {object} doc The document.
 * @param {string} ref The `$ref` value.
 * @return {{external: boolean, value: object|null}} `external` for anything that does not start with `#/`; `value` null when the target is missing.
 */
export function resolveLocalRef(doc, ref) {
	if (typeof ref !== 'string' || !ref.startsWith('#/')) {
		return { external: true, value: null }
	}
	let node = doc
	for (const raw of ref.slice(2).split('/')) {
		const key = raw.replace(/~1/g, '/').replace(/~0/g, '~')
		if (node === null || typeof node !== 'object' || !(key in node)) {
			return { external: false, value: null }
		}
		node = node[key]
	}
	return { external: false, value: node }
}

/**
 * The rules a schema declares, as short text.
 *
 * @param {object} schema The schema.
 * @return {string[]} The rules.
 */
function rulesOf(schema) {
	const rules = []
	const add = (label, value) => {
		if (value !== undefined && value !== null) {
			rules.push(`${label} ${value}`)
		}
	}
	add('minLength', schema.minLength)
	add('maxLength', schema.maxLength)
	add('minimum', schema.minimum)
	add('maximum', schema.maximum)
	add('pattern', schema.pattern)
	add('minItems', schema.minItems)
	add('maxItems', schema.maxItems)
	return rules
}

/**
 * Describe a schema as a tree a table can show.
 *
 * @param {object} doc The document, for local references.
 * @param {object|null} schema The schema (or a `$ref` object).
 * @param {string[]} [trail] References followed on the way here (cycle guard).
 * @return {{type: string, description: string, rules: string[], enumValues: Array, external: boolean, cycle: boolean, refName: string, fields: Array<{name: string, required: boolean, node: object}>, items: object|null}} The node.
 */
export function describeSchema(doc, schema, trail = []) {
	const node = { type: '', description: '', rules: [], enumValues: [], external: false, cycle: false, refName: '', fields: [], items: null }
	if (!schema || typeof schema !== 'object') {
		return node
	}
	let current = schema
	if (typeof current.$ref === 'string') {
		const ref = current.$ref
		const resolved = resolveLocalRef(doc, ref)
		if (resolved.external) {
			return { ...node, external: true, refName: ref }
		}
		node.refName = ref.split('/').pop()
		if (trail.includes(ref)) {
			return { ...node, cycle: true }
		}
		if (!resolved.value || typeof resolved.value !== 'object') {
			return node
		}
		current = resolved.value
		trail = [...trail, ref]
	}
	const types = Array.isArray(current.type) ? current.type.join(' | ') : (current.type || (current.properties ? 'object' : ''))
	node.type = [types, current.format].filter(Boolean).join(' ')
	node.description = String(current.description || '')
	node.rules = rulesOf(current)
	node.enumValues = Array.isArray(current.enum) ? current.enum : []
	if (current.properties && typeof current.properties === 'object') {
		const required = Array.isArray(current.required) ? current.required : []
		node.fields = Object.entries(current.properties).map(([name, prop]) => ({
			name,
			required: required.includes(name),
			node: describeSchema(doc, prop, trail),
		}))
	}
	if (current.items) {
		node.items = describeSchema(doc, current.items, trail)
		node.type = `array of ${node.items.type || node.items.refName || 'items'}`.trim()
	}
	return node
}

/**
 * The first JSON schema of a request or response content map.
 *
 * @param {object|undefined} content An OpenAPI `content` object.
 * @return {{mediaType: string, schema: object}|null} The media type and its schema, or null.
 */
export function firstContentSchema(content) {
	if (!content || typeof content !== 'object') {
		return null
	}
	const entry = Object.entries(content).find(([, v]) => v && v.schema)
	return entry ? { mediaType: entry[0], schema: entry[1].schema } : null
}

/**
 * One sentence per security scheme.
 *
 * @param {object} doc The document.
 * @return {string[]} The sentences.
 */
export function describeSecuritySchemes(doc) {
	const schemes = doc && doc.components && doc.components.securitySchemes
	if (!schemes || typeof schemes !== 'object') {
		return []
	}
	return Object.entries(schemes).map(([name, s]) => {
		if (s.type === 'http') {
			return `${name}: HTTP ${s.scheme || ''}`.trim()
		}
		if (s.type === 'apiKey') {
			return `${name}: API key in ${s.in || 'header'} ${s.name || ''}`.trim()
		}
		if (s.type === 'oauth2') {
			return `${name}: OAuth 2`
		}
		if (s.type === 'openIdConnect') {
			return `${name}: OpenID Connect`
		}
		return `${name}: ${s.type || 'unknown'}`
	})
}
