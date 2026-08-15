/**
 * Entity-scaffold page-template expander (manifest-entity-scaffold-templating).
 *
 * The 2026-07-06 manifest fleet audit (item 12) found scaffold duplication at
 * scale: shillinq ships ~100 near-identical index/detail pages that differ only
 * in register/schema binding, label, and a field/column subset; scholiq repeats
 * one 4-widget detail scaffold ×35. Those pages are not genuinely distinct —
 * they are ONE template instantiated per entity. This module lets a manifest
 * declare the shape ONCE (`pageTemplates[]`) plus a compact per-entity
 * instantiation list (`pageInstances[]`), and materialises them into ordinary
 * concrete `pages[]`.
 *
 * Expansion runs at BUILD/BOOT time (before/at load), so the runtime page
 * renderer (CnPageRenderer) is unchanged by templating — it only ever sees
 * concrete pages. A manifest with no `pageTemplates`/`pageInstances` is returned
 * untouched, so wiring this into the load path is transparent for every app
 * that does not use templating.
 *
 * Two authoring dimensions combine:
 *
 *  1. **Parameter substitution** — a `{{param}}` placeholder in the template's
 *     `page` is replaced with the instantiation's value for `param`. An
 *     exact-match placeholder (`"{{register}}"`) is replaced with the value's
 *     JSON type (string/array/object/…); an embedded placeholder
 *     (`"Edit {{label}}"`) is replaced by string interpolation. A `{{set:NAME}}`
 *     placeholder resolves against the manifest's shared `sets` registry, so a
 *     repeated field/column/sidebar block is declared once and shared. This is
 *     pure value replacement — NOT a merge model.
 *
 *  2. **Structural override (delta)** — an instantiation may carry an
 *     `override` object applied over the substituted page via the SAME
 *     base+delta merge as {@link mergeManifestDelta}. A template is the shared
 *     BASE and an instantiation (or a per-user/app override on top of it) is a
 *     DELTA over that base — the layered-versioned-app-deltas alignment. This
 *     module reuses `mergeManifestDelta` verbatim; it introduces NO second
 *     merge implementation.
 *
 * Named errors: an instantiation referencing an unknown `templateRef`, omitting
 * a required template parameter, referencing an undeclared parameter, or
 * referencing an unknown `{{set:NAME}}` is an expansion error naming the
 * instantiation and the offending reference.
 *
 * The function is pure and Vue-free so it can be unit-tested in isolation, run
 * at build time by the migration codemod, and reused server-side.
 *
 * @module utils/expandPageTemplates
 */

import { mergeManifestDelta } from './mergeManifestDelta.js'

/**
 * Unique sentinel meaning "drop the containing key" — an exact-match
 *  placeholder resolved to an absent OPTIONAL parameter.
 */
const DROP = Symbol('cn-template-drop')

const PLACEHOLDER_RE = /\{\{\s*([^}]+?)\s*\}\}/g

/**
 * Expand a manifest's `pageTemplates[]` + `pageInstances[]` into concrete
 * `pages[]`. Pure: the input manifest is never mutated.
 *
 * A manifest without `pageTemplates` AND without `pageInstances` is returned as
 * a shallow clone, unchanged (no-op fast path). After a successful expansion the
 * `pageInstances` key is removed from the output (its pages now live in
 * `pages[]`); `pageTemplates` and `sets` are retained by default so a runtime /
 * delta consumer can still expand later instantiations, unless `stripTemplates`
 * is set (build-time ship path, where nothing further will instantiate).
 *
 * @param {object} manifest The manifest (may carry pageTemplates/pageInstances/sets).
 * @param {object} [options] Options.
 * @param {boolean} [options.throwOnError] When true, throw an Error whose
 *   message concatenates every named expansion error (build-time / codemod use).
 *   When false (runtime fallback), errors are collected on the returned
 *   `errors` array and the offending instantiation is skipped — every
 *   successfully-expandable page still lands, so a single bad instantiation
 *   never blanks the app.
 * @param {boolean} [options.stripTemplates] When true, drop
 *   `pageTemplates` and `sets` from the output as well (build-time ship path).
 * @return {{ manifest: object, pages: object[], expandedCount: number, errors: string[] }}
 *   `manifest` is the new manifest with instantiations materialised into
 *   `pages[]`; `errors` is the (possibly empty) list of named expansion errors.
 */
export function expandPageTemplates(manifest, options = {}) {
	const { throwOnError = false, stripTemplates = false } = options
	const errors = []

	const templates = Array.isArray(manifest && manifest.pageTemplates) ? manifest.pageTemplates : null
	const instances = Array.isArray(manifest && manifest.pageInstances) ? manifest.pageInstances : null

	// No-op fast path: nothing to expand → return a shallow clone unchanged.
	if (!templates && !instances) {
		return { manifest: { ...manifest }, pages: Array.isArray(manifest && manifest.pages) ? manifest.pages : [], expandedCount: 0, errors }
	}

	const sets = isPlainObject(manifest.sets) ? manifest.sets : {}
	const templateById = new Map()
	for (const tpl of (templates || [])) {
		if (isPlainObject(tpl) && typeof tpl.id === 'string') templateById.set(tpl.id, tpl)
	}

	const basePages = Array.isArray(manifest.pages) ? manifest.pages.map(clone) : []
	const expandedPages = []

	;(instances || []).forEach((instance, index) => {
		const label = instanceLabel(instance, index)
		if (!isPlainObject(instance)) {
			errors.push(`[expandPageTemplates] pageInstances[${index}]: instantiation must be an object`)
			return
		}
		const ref = instance.templateRef
		const template = templateById.get(ref)
		if (!template) {
			errors.push(`[expandPageTemplates] ${label}: references unknown templateRef "${ref}" — no pageTemplates[] entry declares it`)
			return
		}

		// Effective parameter map: register/schema/label shortcuts, then params
		// (params win on conflict).
		const params = effectiveParams(instance)
		const declared = declaredParams(template)

		// Required-parameter check (named error per missing param).
		let missing = false
		for (const [name, spec] of declared) {
			if (spec.required && !(name in params)) {
				errors.push(`[expandPageTemplates] ${label}: template "${ref}" requires parameter "${name}" but the instantiation did not supply it`)
				missing = true
			}
		}
		if (missing) return

		// Substitute placeholders into the template's page shape.
		const localErrors = []
		const substituted = substitute(clone(template.page), params, declared, sets, sets, localErrors, label)
		if (localErrors.length) {
			errors.push(...localErrors)
			return
		}

		// Optional structural override — reuse the base+delta merge (no second
		// merge model). Template page is the base; the instantiation override is
		// the delta over it (layered-versioned-app-deltas alignment).
		let page = substituted
		if (isPlainObject(instance.override)) {
			page = mergeManifestDelta(substituted, instance.override).manifest
		}

		expandedPages.push(page)
	})

	if (errors.length && throwOnError) {
		throw new Error('Page-template expansion failed:\n' + errors.join('\n'))
	}

	const pages = [...basePages, ...expandedPages]
	const out = { ...manifest, pages }
	delete out.pageInstances
	if (stripTemplates) {
		delete out.pageTemplates
		delete out.sets
	}

	return { manifest: out, pages, expandedCount: expandedPages.length, errors }
}

/**
 * Recursively substitute `{{param}}` / `{{set:NAME}}` placeholders in a value.
 *
 * @param {*} node Value to substitute into.
 * @param {object} params Effective parameter map.
 * @param {Map<string, object>} declared Declared params (name → { required }).
 * @param {object} sets Shared named sets registry.
 * @param {object} _sets (unused alias kept for signature symmetry).
 * @param {string[]} errors Accumulator for named errors.
 * @param {string} label Instantiation label for error messages.
 * @return {*} Substituted value, or the DROP sentinel.
 */
function substitute(node, params, declared, sets, _sets, errors, label) {
	if (typeof node === 'string') {
		return substituteString(node, params, declared, sets, errors, label)
	}
	if (Array.isArray(node)) {
		const out = []
		for (const item of node) {
			const v = substitute(item, params, declared, sets, _sets, errors, label)
			if (v !== DROP) out.push(v)
		}
		return out
	}
	if (isPlainObject(node)) {
		const out = {}
		for (const key of Object.keys(node)) {
			const v = substitute(node[key], params, declared, sets, _sets, errors, label)
			if (v !== DROP) out[key] = v // drop keys whose optional param was absent
		}
		return out
	}
	return node
}

/**
 * Substitute placeholders within a single string.
 *
 * @param {string} str The string value.
 * @param {object} params Effective parameter map.
 * @param {Map<string, object>} declared Declared params.
 * @param {object} sets Shared named sets registry.
 * @param {string[]} errors Accumulator for named errors.
 * @param {string} label Instantiation label.
 * @return {*} Substituted value / typed param value / DROP sentinel.
 */
function substituteString(str, params, declared, sets, errors, label) {
	const exact = str.match(/^\{\{\s*([^}]+?)\s*\}\}$/)
	if (exact) {
		const token = exact[1].trim()
		return resolveToken(token, params, declared, sets, errors, label)
	}
	// Embedded placeholders → string interpolation.
	return str.replace(PLACEHOLDER_RE, (_m, tokenRaw) => {
		const token = tokenRaw.trim()
		const v = resolveToken(token, params, declared, sets, errors, label)
		if (v === DROP || v === undefined || v === null) return ''
		return String(v)
	})
}

/**
 * Resolve a single placeholder token to its value.
 *
 * @param {string} token The inner placeholder text (`register` or `set:NAME`).
 * @param {object} params Effective parameter map.
 * @param {Map<string, object>} declared Declared params.
 * @param {object} sets Shared named sets registry.
 * @param {string[]} errors Accumulator for named errors.
 * @param {string} label Instantiation label.
 * @return {*} Resolved value, or DROP when the parameter is absent.
 */
function resolveToken(token, params, declared, sets, errors, label) {
	if (token.startsWith('set:')) {
		const name = token.slice(4).trim()
		if (!(name in sets)) {
			errors.push(`[expandPageTemplates] ${label}: references unknown set "${name}" — no manifest.sets entry declares it`)
			return DROP
		}
		return clone(sets[name])
	}
	// Plain parameter.
	if (!declared.has(token)) {
		errors.push(`[expandPageTemplates] ${label}: template placeholder "{{${token}}}" is not a declared parameter of the template`)
		return DROP
	}
	if (token in params) {
		return clone(params[token])
	}
	// Absent parameter. Required-absence was already reported; an optional
	// absence drops the containing key on an exact match, or interpolates empty
	// (the caller maps DROP → '' in embedded context).
	return DROP
}

/**
 * Build the effective parameter map from an instantiation.
 * @param {object} instance The instantiation object.
 * @return {object} Parameter map (register/schema/label shortcuts + params).
 */
function effectiveParams(instance) {
	const out = {}
	if (instance.register !== undefined) out.register = instance.register
	if (instance.schema !== undefined) out.schema = instance.schema
	if (instance.label !== undefined) out.label = instance.label
	if (isPlainObject(instance.params)) {
		for (const k of Object.keys(instance.params)) out[k] = instance.params[k]
	}
	return out
}

/**
 * Map declared params name → spec ({ required }).
 * @param {object} template The pageTemplate.
 * @return {Map<string, {required: boolean}>} Declared params by name.
 */
function declaredParams(template) {
	const map = new Map()
	if (Array.isArray(template.params)) {
		for (const p of template.params) {
			if (isPlainObject(p) && typeof p.name === 'string') {
				map.set(p.name, { required: p.required === true })
			}
		}
	}
	return map
}

function instanceLabel(instance, index) {
	const id = isPlainObject(instance) && (instance.id || (isPlainObject(instance.params) && instance.params.id))
	return id ? `pageInstances[${index}] (id "${id}")` : `pageInstances[${index}]`
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Structured clone via JSON (manifests are plain JSON — no cycles/functions).
 * @param {*} value The value to clone.
 * @return {*} A deep clone of the value.
 */
function clone(value) {
	if (value === undefined) return undefined
	if (value === null || typeof value !== 'object') return value
	return JSON.parse(JSON.stringify(value))
}
