/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a note's text is made of: plain text, `@mention` chips, and images.
 * Nothing else becomes markup, so a note cannot restyle the page.
 *
 * An image is written `![name](url)`. It renders as an image only when its URL
 * is a file of the SAME record, served by OpenRegister; any other image URL
 * renders as a link, so no request goes to a site the note's author chose.
 *
 * @module utils/noteBody
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-4
 */
import { parseMentions } from './mentions.js'
import { safeHref } from './safeHref.js'

const IMAGE = /!\[([^\]\n]*)\]\(([^)\s]+)\)/g

/**
 * The path part of a URL, without the webroot's `/index.php`.
 *
 * @param {string} url An absolute or root-relative URL.
 * @return {string} The normalised path, or '' when it is not a URL at all.
 */
function normalisedPath(url) {
	try {
		const parsed = new URL(url, 'http://localhost')
		return parsed.pathname.replace(/^(\/index\.php)(?=\/)/, '')
	} catch {
		return ''
	}
}

/**
 * Whether a URL is a file of this record, served by OpenRegister: same origin
 * (relative, or on this page's own origin) and under
 * `/objects/<register>/<schema>/<id>/files/`.
 *
 * @param {string} url The image URL.
 * @param {{apiBase: string, register: string, schema: string, objectId: string}} record Where the record's files live.
 * @return {boolean} True when the image may be loaded.
 */
export function isRecordFileUrl(url, record) {
	if (!record || !record.register || !record.schema || !record.objectId || typeof url !== 'string') {
		return false
	}
	const sameOrigin = (url.startsWith('/') && !url.startsWith('//'))
		|| (typeof window !== 'undefined' && window.location && url.startsWith(`${window.location.origin}/`))
	if (!sameOrigin) {
		return false
	}
	const base = `${record.apiBase.replace(/\/$/, '')}/objects/${encodeURIComponent(record.register)}/${encodeURIComponent(record.schema)}/${encodeURIComponent(record.objectId)}/files/`
	const path = normalisedPath(url)
	return path.startsWith(normalisedPath(base)) && !path.includes('/../')
}

/**
 * Split a note into renderable pieces.
 *
 * @param {string} message The raw note text.
 * @param {{apiBase: string, register: string, schema: string, objectId: string}|null} record Where the record's files live; null shows every image as a link.
 * @return {Array<{type: 'text', value: string}|{type: 'mention', id: string, raw: string, kind?: 'group', groupId?: string}|{type: 'image', alt: string, src: string}|{type: 'link', text: string, href: string}>} Ordered pieces.
 */
export function parseNoteBody(message, record = null) {
	const text = typeof message === 'string' ? message : ''
	const pieces = []
	let last = 0
	IMAGE.lastIndex = 0
	let match
	const pushText = (chunk) => {
		for (const segment of parseMentions(chunk)) {
			pieces.push(segment)
		}
	}
	while ((match = IMAGE.exec(text)) !== null) {
		if (match.index > last) {
			pushText(text.slice(last, match.index))
		}
		const [, alt, src] = match
		if (isRecordFileUrl(src, record)) {
			pieces.push({ type: 'image', alt: alt || '', src })
		} else {
			const href = safeHref(src)
			pieces.push(href === '#' ? { type: 'text', value: match[0] } : { type: 'link', text: alt || src, href })
		}
		last = match.index + match[0].length
	}
	if (last < text.length) {
		pushText(text.slice(last))
	}
	return pieces
}

/**
 * The markdown for an uploaded image, to insert at the caret.
 *
 * @param {string} name The file name.
 * @param {string} url The file's URL.
 * @return {string} `![name](url)`.
 */
export function imageMarkdown(name, url) {
	return `![${String(name).replace(/[[\]\n]/g, ' ')}](${url})`
}
