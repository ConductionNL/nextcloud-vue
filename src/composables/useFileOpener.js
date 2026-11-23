/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useFileOpener — the one way every files component opens a file.
 *
 * Tries, in order: Nextcloud's Viewer (when it is loaded and handles the
 * type), the library's own `CnFilePreview` (CSV, TSV, JSON, XML, text), the
 * browser in a new tab (PDF and images, through `safeHref`), then the Files
 * app permalink.
 *
 * @spec openspec/changes/files-preview-in-place/tasks.md#task-1
 */
import { generateUrl } from '@nextcloud/router'
import { safeHref } from '../utils/safeHref.js'

const PREVIEW_EXT = { csv: 'csv', tsv: 'tsv', json: 'json', xml: 'xml', txt: 'text', md: 'text', log: 'text' }
const PREVIEW_MIME = {
	'text/csv': 'csv',
	'text/tab-separated-values': 'tsv',
	'application/json': 'json',
	'application/xml': 'xml',
	'text/xml': 'xml',
	'text/plain': 'text',
}

/**
 * The mime type of a file row, whichever key carries it.
 *
 * @param {object} file The file row.
 * @return {string} The lower-cased mime type, or ''.
 */
export function fileMime(file) {
	const raw = file?.type || file?.mimetype || file?.mimeType || file?.mime || ''
	return String(raw).split(';')[0].trim().toLowerCase()
}

/**
 * How `CnFilePreview` renders a file, or '' when it does not.
 *
 * @param {object} file The file row.
 * @return {''|'csv'|'tsv'|'json'|'xml'|'text'} The preview kind.
 */
export function previewKindOf(file) {
	const byMime = PREVIEW_MIME[fileMime(file)]
	if (byMime) {
		return byMime
	}
	const name = String(file?.name || file?.title || '')
	const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
	return PREVIEW_EXT[ext] || ''
}

/**
 * Whether the browser can show the file itself (PDF and images).
 *
 * @param {object} file The file row.
 * @return {boolean} True for a PDF or an image.
 */
export function browserShows(file) {
	const mime = fileMime(file)
	return mime === 'application/pdf' || mime.startsWith('image/') || /\.(pdf|png|jpe?g|gif|webp|svg)$/i.test(String(file?.name || ''))
}

/**
 * The URL a file's bytes can be fetched from, validated by `safeHref`.
 *
 * @param {object} file The file row.
 * @return {string} The URL, or '' when none is safe.
 */
export function fileContentUrl(file) {
	for (const candidate of [file?.accessUrl, file?.downloadUrl, file?.url]) {
		const safe = safeHref(candidate)
		if (safe !== '#') {
			return safe
		}
	}
	return ''
}

/**
 * Build the opener.
 *
 * @param {object} [options] Options.
 * @param {(file: object) => void} [options.onPreview] Called with the file when it should open in `CnFilePreview`; the host renders the dialog.
 * @param {(path: string) => string} [options.userRelativePath] Maps a stored path to the Viewer's user-relative path.
 * @param {boolean} [options.anyAccessUrl] Also open any other type through its access URL before the Files app (the sidebar tab's earlier behaviour).
 * @param {(file: object) => string} [options.filesAppUrl] Builds the Files app URL for a file; defaults to the `/f/{id}` permalink.
 * @return {{ open: (file: object) => string, viewerHandles: (file: object) => boolean }} The opener.
 */
export function useFileOpener({ onPreview = null, userRelativePath = (p) => p, anyAccessUrl = false, filesAppUrl = null } = {}) {
	/**
	 * Whether the Viewer is on this page and handles the file.
	 *
	 * @param {object} file The file row.
	 * @return {boolean} True when the Viewer can open it in place.
	 */
	function viewerHandles(file) {
		const viewer = typeof window !== 'undefined' ? window.OCA?.Viewer : null
		if (!viewer || typeof viewer.open !== 'function' || !file?.path) {
			return false
		}
		const mimetypes = Array.isArray(viewer.mimetypes) ? viewer.mimetypes : null
		return mimetypes === null ? true : mimetypes.includes(fileMime(file))
	}

	/**
	 * Open a file by the first way that works.
	 *
	 * @param {object} file The file row.
	 * @return {'viewer'|'preview'|'browser'|'files'|'none'} Which way opened it.
	 */
	function open(file) {
		if (viewerHandles(file)) {
			window.OCA.Viewer.open({ path: userRelativePath(file.path) })
			return 'viewer'
		}
		if (typeof onPreview === 'function' && previewKindOf(file) && fileContentUrl(file)) {
			onPreview(file)
			return 'preview'
		}
		const url = fileContentUrl(file)
		if (url && (browserShows(file) || anyAccessUrl)) {
			// noopener,noreferrer: the URL may be attacker-controlled data.
			window.open(url, '_blank', 'noopener,noreferrer')
			return 'browser'
		}
		const id = file?.id ?? file?.fileId
		if (id) {
			window.open(filesAppUrl ? filesAppUrl(file) : generateUrl('/f/{fileid}', { fileid: id }), '_blank', 'noopener,noreferrer')
			return 'files'
		}
		if (file?.path) {
			// No id to permalink: open the folder holding the file in the Files app.
			const dir = String(file.path).replace(/\/[^/]*$/, '') || '/'
			window.open(generateUrl('/apps/files/?dir={dir}', { dir }), '_blank', 'noopener,noreferrer')
			return 'files'
		}
		return 'none'
	}

	return { open, viewerHandles }
}
