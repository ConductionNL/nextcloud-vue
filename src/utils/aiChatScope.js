/*
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a companion turn is about (one document or one folder), and the
 * sources an answer cites.
 *
 * The scope is read from the page context the companion already carries
 * (`{ appId, pageKind, fileId }`): a document page scopes the turn to that
 * file, a folder page to that folder. Any other page sends no scope, so the
 * backend searches as before.
 */

/**
 * The positive integer in a value (a number or a string of digits), else null.
 *
 * @param {number|string|null|undefined} value The value.
 * @return {number|null} The integer.
 */
function positiveInt(value) {
	const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
	return Number.isInteger(number) && number > 0 ? number : null
}

/**
 * The scope a turn on this page carries: `{ type: 'file' | 'folder', fileId }`,
 * or null when the page is not about one document or folder.
 *
 * @param {object|null|undefined} context The companion's page context.
 * @return {{type: string, fileId: number}|null} The turn scope.
 */
export function turnScopeOf(context) {
	if (!context || typeof context !== 'object') {
		return null
	}
	const fileId = positiveInt(context.fileId ?? context.contextFileId)
	if (fileId === null) {
		return null
	}
	const pageKind = String(context.pageKind || '')
	if (pageKind === 'document' || pageKind === 'file') {
		return { type: 'file', fileId }
	}
	if (pageKind === 'folder') {
		return { type: 'folder', fileId }
	}
	return null
}

/**
 * The file a source opens: its `file_id`, else its `fileId`, else its id, for
 * a file source the person can still open; null for any other source, which
 * is listed by name only.
 *
 * @param {object} source One source of an answer.
 * @return {number|null} The Nextcloud file id.
 */
export function sourceFileId(source) {
	if (!source || source.type !== 'file' || source.available === false) {
		return null
	}
	return positiveInt(source.file_id) ?? positiveInt(source.fileId) ?? positiveInt(source.id)
}

/**
 * The page a source cites, when known.
 *
 * @param {object} source One source of an answer.
 * @return {number|null} The page number.
 */
export function sourcePage(source) {
	return positiveInt(source?.page)
}

/**
 * The name a source is listed under.
 *
 * @param {object} source One source of an answer.
 * @return {string} Its name, else its id.
 */
export function sourceName(source) {
	return String(source?.name || source?.id || '')
}
