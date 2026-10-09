/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The diagnostics channel: one function a host listens with to hear each
 * request, render error, unknown component and binding problem. The library
 * sends nothing anywhere itself. Without a listener no report is built and
 * no timing is taken.
 *
 * A report is a plain object with `kind` and `at`; `CnAppRoot` adds `pageId`.
 * It never holds a request or response body, a header, a query value or a
 * user id. The one free text is a render error's message, handed over in
 * memory.
 *
 * @module utils/diagnostics
 * @spec openspec/changes/app-diagnostics-channel/tasks.md#task-1
 */

const listeners = new Set()
const dropped = new WeakSet()

/**
 * Add a listener. Returns the function that removes it.
 *
 * @param {(report: object) => void} listener Called with each report.
 * @return {() => void} Removes the listener.
 */
export function addDiagnosticsListener(listener) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

/** @return {boolean} Whether anyone is listening (callers skip all work when not). */
export function hasDiagnosticsListener() {
	return listeners.size > 0
}

/**
 * A request path with its query keys and none of its values.
 *
 * @param {string} url The request URL (absolute or app-relative).
 * @return {string} For example `/api/objects/a/permit?_search&_limit`.
 */
export function cleanDiagnosticPath(url) {
	const text = String(url)
	const hashless = text.split('#')[0]
	const at = hashless.indexOf('?')
	const rawPath = at === -1 ? hashless : hashless.slice(0, at)
	const path = rawPath.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
	if (at === -1) {
		return path
	}
	const keys = []
	for (const pair of hashless.slice(at + 1).split('&')) {
		const key = decodeURIComponent(pair.split('=')[0] || '').trim()
		if (key !== '' && !keys.includes(key)) {
			keys.push(key)
		}
	}
	return keys.length > 0 ? `${path}?${keys.join('&')}` : path
}

/**
 * Call a listener outside the call that caused the report. A listener that
 * throws is dropped for the rest of the session, with one console warning.
 *
 * @param {(report: object) => void} listener The listener.
 * @param {object} report The report.
 */
export function safeCall(listener, report) {
	queueMicrotask(() => {
		if (dropped.has(listener)) {
			return
		}
		try {
			listener(report)
		} catch (error) {
			dropped.add(listener)
			listeners.delete(listener)
			// eslint-disable-next-line no-console
			console.warn('[nextcloud-vue] A diagnostics listener threw and was dropped:', error)
		}
	})
}

/**
 * Report to every listener. Cheap when nobody listens.
 *
 * @param {object|(() => object)} report The report, or a function building it (not called without listeners).
 */
export function reportDiagnostic(report) {
	if (listeners.size === 0) {
		return
	}
	const built = { at: Date.now(), ...(typeof report === 'function' ? report() : report) }
	for (const listener of [...listeners]) {
		safeCall(listener, { ...built })
	}
}

const reported = new Set()

/**
 * Report a manifest column key or `includeFields` entry whose property the
 * schema lacks, once per page visit. Skips `@self.*` keys, dotted paths into a
 * reference, and aggregate or expression columns.
 *
 * @param {object|null} schema The loaded schema.
 * @param {object} binding What the page declares.
 * @param {string} [binding.register] The register slug.
 * @param {Array<(string|object)>} [binding.columns] Declared columns (keys or `{ key, aggregate?, expression? }`).
 * @param {Array<string>} [binding.includeFields] Declared form fields.
 */
export function reportBindingProblems(schema, { register = '', columns = [], includeFields = null } = {}) {
	if (listeners.size === 0 || !schema || typeof schema.properties !== 'object' || schema.properties === null) {
		return
	}
	const slug = String(schema.slug || schema.title || schema.id || '')
	const check = (property, where) => {
		if (typeof property !== 'string' || property === '' || property.startsWith('@self.') || property.includes('.')) {
			return
		}
		if (!Object.hasOwn(schema.properties, property)) {
			reportDiagnosticOnce(`binding|${slug}|${property}|${where}`, {
				kind: 'binding',
				problem: 'missing-property',
				register: String(register || ''),
				schema: slug,
				property,
				where,
			})
		}
	}
	for (const column of Array.isArray(columns) ? columns : []) {
		if (typeof column === 'string') {
			check(column, 'column')
		} else if (column && typeof column === 'object' && !column.aggregate && !column.expression) {
			check(column.key, 'column')
		}
	}
	for (const field of Array.isArray(includeFields) ? includeFields : []) {
		check(field, 'field')
	}
}

/**
 * Report once per key until `clearReportedDiagnostics()` (a page visit ends).
 *
 * @param {string} key What makes this report the same report.
 * @param {object|(() => object)} report The report, or a function building it.
 */
export function reportDiagnosticOnce(key, report) {
	if (listeners.size === 0 || reported.has(key)) {
		return
	}
	reported.add(key)
	reportDiagnostic(report)
}

/** Forget what was reported once, so the next page visit reports again. */
export function clearReportedDiagnostics() {
	reported.clear()
}

/**
 * The object type a request path names (`/objects/<register>/<schema>`), else null.
 *
 * @param {string} path A cleaned path.
 * @return {string|null} The schema slug or id.
 */
function objectTypeOf(path) {
	const m = /\/objects\/[^/?]+\/([^/?]+)/.exec(path)
	return m ? decodeURIComponent(m[1]) : null
}

/**
 * Count the rows of a response without consuming it.
 *
 * @param {Response} response The response.
 * @return {Promise<number|null>} Results of a list, 1 for one object, else null.
 */
async function rowsOf(response) {
	try {
		if (!response || typeof response.clone !== 'function') {
			return null
		}
		const body = await response.clone().json()
		if (Array.isArray(body)) {
			return body.length
		}
		if (body && Array.isArray(body.results)) {
			return body.results.length
		}
		return body && typeof body === 'object' ? 1 : null
	} catch {
		return null
	}
}

/**
 * `fetch`, reporting a `request` when someone listens. With no listener it is
 * exactly `fetch`: no timing, no report object.
 *
 * @param {string} url The request URL.
 * @param {object} [init] The fetch options.
 * @param {string} [source] `store` (default) or `cnFetch`.
 * @return {Promise<Response>} The response.
 */
export async function trackedFetch(url, init, source = 'store') {
	if (listeners.size === 0) {
		return fetch(url, init)
	}
	const started = performance.now()
	const method = String((init && init.method) || 'GET').toUpperCase()
	let response
	try {
		response = await fetch(url, init)
	} catch (error) {
		const path = cleanDiagnosticPath(url)
		reportDiagnostic({ kind: 'request', method, path, status: 0, durationMs: Math.round(performance.now() - started), rows: null, source, objectType: objectTypeOf(path) })
		throw error
	}
	const durationMs = Math.round(performance.now() - started)
	const path = cleanDiagnosticPath(url)
	const status = response && typeof response.status === 'number' ? response.status : 0
	const rows = status >= 200 && status < 300 ? await rowsOf(response) : null
	reportDiagnostic({ kind: 'request', method, path, status, durationMs, rows, source, objectType: objectTypeOf(path) })
	return response
}
