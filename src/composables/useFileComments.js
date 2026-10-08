/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useFileComments — read, add and delete Nextcloud file comments through the
 * comments DAV endpoint (the calls the Files sidebar's comments tab makes).
 *
 * @spec openspec/changes/notes-on-a-file/tasks.md#task-1
 */
import { unref } from 'vue'
import { buildHeaders, prefixUrl } from '../utils/index.js'

const NS_OC = 'http://owncloud.org/ns'
const DEFAULT_LIMIT = 200

/**
 * An error carrying the HTTP status, so a caller can tell "no access" (403, 404) from a failure.
 *
 * @param {string} message What failed.
 * @param {number} status  The HTTP status.
 * @return {Error} The error, with `status` set.
 */
function httpError(message, status) {
	const err = new Error(message)
	err.status = status
	return err
}

/**
 * Parse a comments REPORT multistatus body into the shared note shape.
 *
 * @param {string} xml The response body.
 * @return {Array<{id: string, message: string, actorId: string, actorDisplayName: string, creationDateTime: string, isUnread: boolean, isOwn: boolean}>} The comments.
 */
export function parseFileComments(xml) {
	const doc = new DOMParser().parseFromString(xml, 'application/xml')
	const currentUser = typeof OC !== 'undefined' && OC ? OC.currentUser : null
	const text = (node, name) => {
		const el = node.getElementsByTagNameNS(NS_OC, name)[0]
		return el && el.textContent !== null ? el.textContent : ''
	}
	return Array.from(doc.getElementsByTagNameNS('DAV:', 'prop'))
		.filter((prop) => text(prop, 'id') !== '')
		.map((prop) => {
			const actorId = text(prop, 'actorId')
			return {
				id: text(prop, 'id'),
				message: text(prop, 'message'),
				actorId,
				actorDisplayName: text(prop, 'actorDisplayName') || actorId,
				creationDateTime: text(prop, 'creationDateTime'),
				isUnread: text(prop, 'isUnread') === 'true',
				isOwn: currentUser !== null && actorId === currentUser,
			}
		})
}

/**
 * Comments on one file.
 *
 * @param {string|number|object} fileId The Nextcloud file id (or a ref holding it).
 * @return {{list: Function, add: Function, remove: Function, count: Function}} The calls; each rejects with an error carrying `status` when Nextcloud refuses.
 */
export function useFileComments(fileId) {
	const base = () => prefixUrl(`/remote.php/dav/comments/files/${encodeURIComponent(String(unref(fileId)))}`)

	return {
		/**
		 * List the file's comments, newest last as Nextcloud returns them.
		 *
		 * @param {{limit?: number, offset?: number}} [options] Page window.
		 * @return {Promise<Array<object>>} The comments in the shared note shape.
		 */
		async list(options = {}) {
			const limit = Number.isFinite(options.limit) ? options.limit : DEFAULT_LIMIT
			const offset = Number.isFinite(options.offset) ? options.offset : 0
			const body = `<?xml version="1.0"?>\n<oc:filter-comments xmlns:d="DAV:" xmlns:oc="${NS_OC}"><oc:limit>${limit}</oc:limit><oc:offset>${offset}</oc:offset></oc:filter-comments>`
			const response = await fetch(base(), {
				method: 'REPORT',
				headers: buildHeaders({ contentType: 'application/xml; charset=utf-8' }),
				body,
			})
			if (!response.ok) {
				throw httpError('Could not read the comments', response.status)
			}
			return parseFileComments(await response.text())
		},

		/**
		 * Add a comment.
		 *
		 * @param {string} message The note text.
		 * @return {Promise<void>}
		 */
		async add(message) {
			const response = await fetch(base(), {
				method: 'POST',
				headers: buildHeaders(),
				body: JSON.stringify({ actorType: 'users', verb: 'comment', message }),
			})
			if (!response.ok) {
				throw httpError('Could not add the comment', response.status)
			}
		},

		/**
		 * Delete a comment (Nextcloud only allows your own).
		 *
		 * @param {string|number} commentId The comment id.
		 * @return {Promise<void>}
		 */
		async remove(commentId) {
			const response = await fetch(`${base()}/${encodeURIComponent(String(commentId))}`, {
				method: 'DELETE',
				headers: buildHeaders(),
			})
			if (!response.ok) {
				throw httpError('Could not delete the comment', response.status)
			}
		},

		/**
		 * Number of comments on the file.
		 *
		 * @return {Promise<number>} The count.
		 */
		async count() {
			return (await this.list()).length
		},
	}
}
