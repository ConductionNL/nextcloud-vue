/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A data source for CnFilesBrowser that reads and writes one OpenRegister
 * object's folder through OpenRegister's own files API, not WebDAV.
 *
 * Why: an object's files live in the `openregister` account's home, outside
 * every person's Files app, so a reader has no WebDAV path to them. Every call
 * here goes through the object's access rule on the server, as the signed-in
 * person: a listing needs read on the object, a change needs update. Nothing
 * is shared to make the folder visible.
 *
 * Paths are relative to the object folder and written with a leading slash
 * (`/`, `/Bijlagen`), the same shape the WebDAV browser uses for its own
 * paths, so crumbs and navigation work unchanged.
 *
 * @spec openspec/changes/files-browser-openregister-source/specs/files-browser/spec.md
 */
import axios from '@nextcloud/axios'
import { FileType } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'

/**
 * A browser path (`/a/b`) as the API's relative path (`a/b`).
 *
 * @param {string} path The browser path.
 * @return {string} The relative path, empty for the root.
 */
export function toApiPath(path) {
	return String(path || '').replace(/^\/+|\/+$/g, '')
}

/**
 * One API listing entry as a row the browser can render and sort.
 *
 * The shape follows what the browser reads off an `@nextcloud/files` node
 * (basename, type, mime, size, mtime, fileid, path, source, attributes), so
 * the table, the sorter and the icons need no second code path.
 *
 * @param {object} entry The API entry: `{ id, name, type, mimetype, size, mtime, path }`.
 * @return {object} The row.
 */
export function entryToNode(entry) {
	const isFolder = entry.type === 'folder'
	return {
		source: `openregister:${entry.id}`,
		fileid: entry.id,
		basename: entry.name,
		displayname: entry.name,
		path: `/${toApiPath(entry.path)}`,
		type: isFolder ? FileType.Folder : FileType.File,
		mime: isFolder ? 'httpd/unix-directory' : (entry.mimetype || ''),
		size: typeof entry.size === 'number' ? entry.size : undefined,
		mtime: typeof entry.mtime === 'number' ? new Date(entry.mtime * 1000) : undefined,
		attributes: {},
	}
}

/**
 * The status of a failed request, or null.
 *
 * @param {Error} err The error.
 * @return {number|null} The HTTP status.
 */
function statusOf(err) {
	return err?.response?.status ?? err?.status ?? null
}

/**
 * The server's own message on a failed request, or null.
 *
 * @param {Error} err The error.
 * @return {string|null} The message.
 */
function messageOf(err) {
	const data = err?.response?.data
	return (data && typeof data.error === 'string' && data.error !== '') ? data.error : null
}

/**
 * Build the OpenRegister source for one object.
 *
 * @param {object} options The object.
 * @param {string} [options.apiBase] OpenRegister's API base, `/apps/openregister/api`.
 * @param {string} options.register The register slug or id.
 * @param {string} options.schema The schema slug or id.
 * @param {string} options.objectId The object's uuid.
 * @return {object} The source CnFilesBrowser takes as `source`.
 */
export function createOpenRegisterSource({ apiBase = '/apps/openregister/api', register, schema, objectId }) {
	const objectUrl = (suffix) => generateUrl(`${apiBase}/objects/{register}/{schema}/{objectId}${suffix}`, { register, schema, objectId })

	/**
	 * Re-throw a failed request with its status and the server's message.
	 *
	 * @param {Error} err The error.
	 * @return {never}
	 */
	const fail = (err) => {
		const error = new Error(messageOf(err) || err?.message || 'Request failed')
		error.status = statusOf(err)
		throw error
	}

	return {
		kind: 'openregister',

		/**
		 * List a folder.
		 *
		 * @param {string} path The browser path.
		 * @return {Promise<{folder: object, nodes: Array<object>}>} The folder (with `canChange`) and its rows.
		 */
		async list(path) {
			try {
				const { data } = await axios.get(objectUrl('/folder'), { params: { path: toApiPath(path) } })
				if (!Array.isArray(data?.entries)) {
					// Not a folder listing: an OpenRegister without these endpoints.
					const error = new Error('This OpenRegister has no folder endpoint')
					error.status = 501
					throw error
				}
				const relative = toApiPath(data?.path ?? path)
				return {
					folder: {
						fileid: data?.folderId ?? null,
						path: `/${relative}`,
						basename: relative.split('/').pop() || '',
						type: FileType.Folder,
						canChange: data?.canChange === true,
					},
					nodes: data.entries.map(entryToNode),
				}
			} catch (err) {
				if (err?.status && !err.response) {
					throw err
				}
				return fail(err)
			}
		},

		/**
		 * Create a folder.
		 *
		 * @param {string} path Where, as a browser path.
		 * @param {string} name The new folder's name.
		 * @return {Promise<object>} The new folder's row.
		 */
		async createFolder(path, name) {
			try {
				const { data } = await axios.post(objectUrl('/folder'), { path: toApiPath(path), name })
				return entryToNode(data)
			} catch (err) {
				return fail(err)
			}
		},

		/**
		 * Upload one file into a folder.
		 *
		 * @param {string} path The target folder, as a browser path.
		 * @param {File} file The file.
		 * @param {(percent: number) => void} [onProgress] Called with 0..100.
		 * @return {Promise<object>} The stored file's row.
		 */
		async upload(path, file, onProgress) {
			const form = new FormData()
			form.append('path', toApiPath(path))
			form.append('files[]', file, file.name)
			try {
				const { data } = await axios.post(objectUrl('/folder/upload'), form, {
					onUploadProgress: (progress) => {
						if (progress?.total && typeof onProgress === 'function') {
							onProgress(Math.round((progress.loaded / progress.total) * 100))
						}
					},
				})
				const stored = Array.isArray(data?.stored) ? data.stored : []
				if (stored.length === 0) {
					const error = new Error(data?.rejected?.[0]?.error || 'The upload failed')
					error.status = 400
					throw error
				}
				return entryToNode(stored[0])
			} catch (err) {
				if (err?.status && !err.response) {
					throw err
				}
				return fail(err)
			}
		},

		/**
		 * Rename a file or folder.
		 *
		 * @param {object} node The row.
		 * @param {string} name The new name.
		 * @return {Promise<object>} The renamed row.
		 */
		async rename(node, name) {
			try {
				const { data } = await axios.put(objectUrl(`/folder/${encodeURIComponent(node.fileid)}`), { name })
				return entryToNode(data)
			} catch (err) {
				return fail(err)
			}
		},

		/**
		 * Delete a file or folder.
		 *
		 * @param {object} node The row.
		 * @return {Promise<void>}
		 */
		async remove(node) {
			try {
				await axios.delete(objectUrl(`/folder/${encodeURIComponent(node.fileid)}`))
			} catch (err) {
				fail(err)
			}
		},

		/**
		 * Where a file downloads from: the object's own file endpoint, which
		 * checks read on the object.
		 *
		 * @param {object} node The row.
		 * @return {string|null} The url, or null for a folder.
		 */
		downloadUrl(node) {
			if (!node?.fileid || node.type === FileType.Folder) {
				return null
			}
			return objectUrl(`/files/${encodeURIComponent(node.fileid)}`)
		},

		/**
		 * A small preview of an image, through the object's preview endpoint.
		 *
		 * @param {object} node The row.
		 * @return {string} The url.
		 */
		previewUrl(node) {
			return objectUrl(`/files/${encodeURIComponent(node.fileid)}/preview?width=64&height=64`)
		},
	}
}
