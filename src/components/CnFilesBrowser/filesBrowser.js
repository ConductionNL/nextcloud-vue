/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The pure half of CnFilesBrowser: paths, crumbs and the folder lookup.
 *
 * Kept out of the component so a test can pin them without a DAV server:
 * a wrong path here sends every listing to the wrong folder, silently.
 */
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * Actions the Files app registers that cannot run on a page without the Files
 * app's own list: the details action opens the Files sidebar, which on
 * Nextcloud 34 is a store bound to the Files router and node list, and the
 * folder-navigation actions route through that list.
 *
 * @type {string[]}
 */
export const ACTIONS_NEEDING_THE_FILES_PAGE = ['details', 'sidebar', 'open-folder', 'view-in-folder']

/**
 * A DAV href for a node under the user's files root, as a path relative to
 * that root: `/remote.php/dav/files/admin/Open%20Registers/x/` becomes
 * `/Open Registers/x`.
 *
 * @param {string} href The href as the DAV server returned it.
 * @param {string} uid The current user's id.
 * @return {string} The user-relative path without a trailing slash, `/` at least.
 */
export function userRelativePathFromHref(href, uid) {
	let decoded
	try {
		decoded = decodeURIComponent(String(href || ''))
	} catch {
		decoded = String(href || '')
	}
	const marker = `/dav/files/${uid}`
	const at = decoded.indexOf(marker)
	const rest = at === -1 ? decoded : decoded.slice(at + marker.length)
	const trimmed = rest.replace(/\/+$/, '')
	return trimmed === '' ? '/' : trimmed
}

/**
 * Join a directory and a name into a path, with exactly one slash between.
 *
 * @param {string} dir The directory path.
 * @param {string} name The child name.
 * @return {string} The child's path.
 */
export function joinPath(dir, name) {
	return `${String(dir || '').replace(/\/+$/, '')}/${String(name || '').replace(/^\/+/, '')}`
}

/**
 * The breadcrumb trail from the browser's root down to the current folder.
 *
 * The root is named by the caller (the object's folder is a uuid on disk,
 * which is not a name a person reads), and every segment beneath it is the
 * folder's own basename.
 *
 * @param {string} rootPath The browser's root, user-relative.
 * @param {string} currentPath The open folder, user-relative, at or below the root.
 * @param {string} rootLabel What the root crumb reads.
 * @return {Array<{name: string, path: string}>} The crumbs, root first.
 */
export function crumbsFor(rootPath, currentPath, rootLabel) {
	const root = String(rootPath || '/').replace(/\/+$/, '') || '/'
	const current = String(currentPath || root).replace(/\/+$/, '') || '/'
	const crumbs = [{ name: rootLabel, path: root }]
	if (current === root || !current.startsWith(root === '/' ? '/' : `${root}/`)) {
		return crumbs
	}
	const below = root === '/' ? current.slice(1) : current.slice(root.length + 1)
	let path = root
	for (const segment of below.split('/').filter(Boolean)) {
		path = joinPath(path, segment)
		crumbs.push({ name: segment, path })
	}
	return crumbs
}

/**
 * The DAV SEARCH body that finds one node by its file id under the user's root.
 *
 * @param {number|string} fileId The Nextcloud file id.
 * @param {string} uid The current user's id.
 * @return {string} The request body.
 */
export function fileIdSearchBody(fileId, uid) {
	const id = String(fileId).replace(/[^0-9]/g, '')
	const scope = `/files/${uid}`.replace(/[<>&]/g, '')
	return '<?xml version="1.0"?>'
		+ '<d:searchrequest xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:basicsearch>'
		+ '<d:select><d:prop><oc:fileid/></d:prop></d:select>'
		+ `<d:from><d:scope><d:href>${scope}</d:href><d:depth>infinity</d:depth></d:scope></d:from>`
		+ `<d:where><d:eq><d:prop><oc:fileid/></d:prop><d:literal>${id}</d:literal></d:eq></d:where>`
		+ '</d:basicsearch></d:searchrequest>'
}

/**
 * The first `d:href` in a DAV multistatus body, or null.
 *
 * @param {string} xml The response body.
 * @return {string|null} The href.
 */
export function firstHrefIn(xml) {
	try {
		const doc = new DOMParser().parseFromString(String(xml || ''), 'application/xml')
		const href = doc.getElementsByTagNameNS('DAV:', 'href')[0]
		return href ? href.textContent : null
	} catch {
		return null
	}
}

/**
 * Where an OpenRegister object keeps its files, as a user-relative path.
 *
 * The object carries the folder's file id in `@self.folder`; a DAV search
 * by that id turns it into a path the DAV client can list. Null when the
 * object has no folder, or the search cannot see it (a user the folder is
 * not shared with), in which case the caller falls back to the object's
 * files endpoint.
 *
 * @param {object} options The lookup.
 * @param {string} options.apiBase OpenRegister's API base, `/apps/openregister/api`.
 * @param {string} options.register The register slug.
 * @param {string} options.schema The schema slug.
 * @param {string} options.objectId The object's uuid.
 * @param {string} options.uid The current user's id.
 * @param {string} options.remoteUrl The DAV remote url, `…/remote.php/dav`.
 * @return {Promise<string|null>} The user-relative folder path, or null.
 */
export async function resolveObjectFolder({ apiBase, register, schema, objectId, uid, remoteUrl }) {
	if (!register || !schema || !objectId || !uid) {
		return null
	}
	let folderId
	try {
		const { data } = await axios.get(generateUrl(`${apiBase}/objects/{register}/{schema}/{objectId}`, { register, schema, objectId }))
		folderId = data?.['@self']?.folder ?? null
	} catch {
		return null
	}
	if (folderId === null || folderId === '' || Number.isNaN(Number(folderId))) {
		return null
	}
	try {
		const response = await axios.request({
			method: 'SEARCH',
			url: `${remoteUrl.replace(/\/+$/, '')}/`,
			headers: { 'Content-Type': 'application/xml' },
			data: fileIdSearchBody(folderId, uid),
			responseType: 'text',
		})
		const href = firstHrefIn(response.data)
		return href === null ? null : userRelativePathFromHref(href, uid)
	} catch {
		return null
	}
}
