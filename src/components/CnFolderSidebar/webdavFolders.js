import axios from '@nextcloud/axios'
import { getCurrentUser } from '@nextcloud/auth'
import { generateRemoteUrl } from '@nextcloud/router'

/**
 * Default WebDAV folder loader for CnFolderSidebar's `files` source.
 *
 * PROPFINDs the user's files under `path` and returns immediate child
 * collections (folders), recursing up to `depth` levels. Each returned node is
 * `{ id, name, icon: 'Folder', children }` where `id` is the folder's
 * path relative to the files root — the value emitted by `@select`.
 *
 * Server WebDAV commonly forbids `Depth: infinity`, so this walks one
 * `Depth: 1` request per folder, bounded by `depth`.
 *
 * @param {object} ctx Loader context.
 * @param {string} ctx.path Files-root-relative path to list (e.g. '/Vault').
 * @param {number} [ctx.depth] How many levels to recurse (1 = children only).
 * @return {Promise<Array<{ id: string, name: string, icon: string, children: Array }>>} The folder tree.
 */
export async function fetchWebdavFolderTree({ path, depth = 1 }) {
	const user = getCurrentUser()
	if (!user) return []
	const root = `/files/${user.uid}`
	return listChildren(root, normalizePath(path), depth)
}

/**
 * List the child folders of `relPath` and recurse.
 *
 * @param {string} davRoot The `/files/<uid>` DAV prefix.
 * @param {string} relPath The path relative to the files root (leading slash).
 * @param {number} depth Remaining recursion levels.
 * @return {Promise<Array>} Child folder nodes.
 */
async function listChildren(davRoot, relPath, depth) {
	const url = generateRemoteUrl('dav') + davRoot + encodePath(relPath)
	const body = '<?xml version="1.0"?>'
		+ '<d:propfind xmlns:d="DAV:"><d:prop>'
		+ '<d:resourcetype/><d:displayname/>'
		+ '</d:prop></d:propfind>'

	const response = await axios.request({
		method: 'PROPFIND',
		url,
		headers: { Depth: '1', 'Content-Type': 'application/xml' },
		data: body,
	})

	const doc = new DOMParser().parseFromString(response.data, 'application/xml')
	const responses = Array.from(doc.getElementsByTagNameNS('DAV:', 'response'))
	const basePrefix = generateRemoteUrl('dav') + davRoot
	const nodes = []

	for (const res of responses) {
		const href = text(res, 'href')
		if (!href) continue
		const isCollection = res.getElementsByTagNameNS('DAV:', 'collection').length > 0
		if (!isCollection) continue

		const childPath = decodeURIComponent(href)
			.replace(/^https?:\/\/[^/]+/, '')
			.replace(basePrefix, '')
			.replace(/\/$/, '')
		// Skip the queried folder itself (PROPFIND includes it).
		if (childPath === relPath.replace(/\/$/, '') || childPath === '') continue

		const name = decodeURIComponent(href.replace(/\/$/, '').split('/').pop())
		nodes.push({
			id: childPath,
			name,
			icon: 'Folder',
			children: depth > 1 ? await listChildren(davRoot, childPath, depth - 1) : [],
		})
	}

	return nodes
}

/**
 * Extract the text of the first DAV element named `local` within `parent`.
 *
 * @param {Element} parent The container element.
 * @param {string} local The local (namespace-less) tag name.
 * @return {string} The text content, or ''.
 */
function text(parent, local) {
	const el = parent.getElementsByTagNameNS('DAV:', local)[0]
	return el ? el.textContent : ''
}

/**
 * Normalise a path to a single leading slash and no trailing slash.
 *
 * @param {string} path The raw path.
 * @return {string} The normalised path.
 */
function normalizePath(path) {
	const trimmed = (path || '/').replace(/\/+$/, '')
	return trimmed.startsWith('/') ? trimmed : '/' + trimmed
}

/**
 * Percent-encode each path segment while preserving the slashes.
 *
 * @param {string} path The path to encode.
 * @return {string} The encoded path.
 */
function encodePath(path) {
	return path.split('/').map(encodeURIComponent).join('/')
}
