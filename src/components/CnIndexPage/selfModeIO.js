import { buildHeaders, buildQueryString, prefixUrl } from '../../utils/headers.js'

/**
 * Build a copy-ready payload from a source object — strips identity so the
 * store treats the save as a create, then writes `newName` into `nameField`.
 *
 * @param {object} source Row to copy from.
 * @param {string} newName Name to set on the copy.
 * @param {string} nameField Property on the object holding its name.
 * @return {object}
 */
export function cloneObjectForCopy(source, newName, nameField) {
	const { id, uuid, '@self': _self, ...rest } = source
	const clone = JSON.parse(JSON.stringify(rest))
	if (nameField) {
		clone[nameField] = newName
	}
	return clone
}

/**
 * Save a Blob to disk via a temporary object-URL anchor.
 *
 * @param {Blob} blob File contents.
 * @param {string} filename Suggested filename.
 */
export function triggerBlobDownload(blob, filename) {
	const blobUrl = window.URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = blobUrl
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	window.URL.revokeObjectURL(blobUrl)
}

/**
 * Parse `filename` out of a Content-Disposition header value.
 *
 * @param {string} disposition Raw header value.
 * @param {string} fallback Filename to return when no match.
 * @return {string}
 */
export function parseDispositionFilename(disposition, fallback) {
	const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition || '')
	return match ? decodeURIComponent(match[1]) : fallback
}

/**
 * @param {{ register: string, schema: string, format: string }} params The export
 *   target: the OpenRegister `register` and `schema` slugs, plus the export
 *   `format` (`'csv'`, `'excel'`, …) sent as the `type` query parameter. `'excel'`
 *   is the only format whose downloaded extension differs (`xlsx`).
 * @return {Promise<void>} Resolves once the browser download has been triggered;
 *   rejects when the server responds non-2xx.
 */
export async function runSelfExportRequest({ register, schema, format }) {
	const base = `/apps/openregister/api/objects/${register}/${schema}/export`
	const url = prefixUrl(base) + buildQueryString({ type: format })
	const response = await fetch(url, { method: 'GET', headers: buildHeaders() })
	if (!response.ok) {
		throw new Error(`Export failed (${response.status})`)
	}
	const blob = await response.blob()
	const ext = format === 'excel' ? 'xlsx' : (format || 'csv')
	const filename = parseDispositionFilename(
		response.headers.get('content-disposition'),
		`${register}_${schema}.${ext}`,
	)
	triggerBlobDownload(blob, filename)
}

/**
 * @param {{ register: string, schema: string|null, file: File }} params The import
 *   target: the OpenRegister `register` slug, the `schema` slug (required for a
 *   CSV upload, which cannot carry its own schema; `null` otherwise), and the
 *   user-picked `file` posted as multipart form data.
 * @return {Promise<void>} Resolves once the upload succeeded; rejects when no
 *   file was selected or the server responds non-2xx.
 */
export async function runSelfImportRequest({ register, schema, file }) {
	if (!file) {
		throw new Error('No file selected')
	}
	const ext = (file.name.split('.').pop() || '').toLowerCase()
	const isCsv = ext === 'csv' && !!schema
	let path = `/apps/openregister/api/registers/${register}/import`
	if (isCsv) {
		path += buildQueryString({ schema })
	}
	const formData = new FormData()
	formData.append('file', file)
	if (isCsv) {
		formData.append('schema', schema)
	}
	// buildHeaders(null) — CSRF + OCS but no Content-Type, so the browser
	// sets the multipart boundary itself.
	const response = await fetch(prefixUrl(path), {
		method: 'POST',
		headers: buildHeaders(null),
		body: formData,
	})
	if (!response.ok) {
		throw new Error(`Import failed (${response.status})`)
	}
}
