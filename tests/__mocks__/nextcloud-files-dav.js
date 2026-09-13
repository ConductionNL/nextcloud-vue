/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@nextcloud/files/dav` for jest: see nextcloud-files.js for why. A test
 * that wants a listing sets `global.__cnDavContents` to the array of
 * `{ filename, basename, type, size, mime, lastmod, props }` the client
 * returns, the first entry being the folder itself.
 */
const FileType = { File: 'file', Folder: 'folder' }

function getRootPath() {
	return '/files/admin'
}

function getRemoteURL() {
	return 'http://localhost/remote.php/dav'
}

function getDefaultPropfind() {
	return '<propfind/>'
}

const calls = { createDirectory: [], putFileContents: [] }

function getClient() {
	return {
		async getDirectoryContents() {
			return { data: Array.isArray(global.__cnDavContents) ? global.__cnDavContents : [] }
		},
		async createDirectory(path) {
			calls.createDirectory.push(path)
		},
		async putFileContents(path, data, options) {
			calls.putFileContents.push(path)
			if (options && typeof options.onUploadProgress === 'function') {
				options.onUploadProgress({ loaded: 1, total: 1 })
			}
		},
	}
}

function resultToNode(stat) {
	const isFolder = stat.type === 'directory'
	return {
		source: `${getRemoteURL()}${stat.filename}`,
		path: String(stat.filename).replace(/^\/files\/[^/]+/, '') || '/',
		basename: stat.basename,
		type: isFolder ? FileType.Folder : FileType.File,
		mime: isFolder ? 'httpd/unix-directory' : (stat.mime || ''),
		size: stat.size,
		mtime: stat.lastmod ? new Date(stat.lastmod) : undefined,
		fileid: stat.props && stat.props.fileid ? Number(stat.props.fileid) : undefined,
	}
}

module.exports = { getClient, getDefaultPropfind, getRootPath, getRemoteURL, resultToNode, __calls: calls }
