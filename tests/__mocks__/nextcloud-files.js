/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@nextcloud/files` 4.x ships ESM only (an `import` condition and nothing
 * else), which jest's CommonJS resolver cannot load. This is the surface
 * CnFilesBrowser uses, small enough to read in one screen. A test that needs
 * registered actions sets `global.__cnFileActions`; a test that needs New
 * menu entries sets `global.__cnNewMenuEntries`.
 */
const FileType = { File: 'file', Folder: 'folder' }

class View {
	constructor(data) {
		this._data = data || {}
	}

	get id() {
		return this._data.id
	}

	get name() {
		return this._data.name
	}
}

function getFileActions() {
	return Array.isArray(global.__cnFileActions) ? global.__cnFileActions : []
}

function getNewFileMenuEntries() {
	return Array.isArray(global.__cnNewMenuEntries) ? global.__cnNewMenuEntries : []
}

function sortNodes(nodes, options = {}) {
	const key = options.sortingMode || 'basename'
	const dir = options.sortingOrder === 'desc' ? -1 : 1
	const value = (node) => (key === 'mtime' ? (node.mtime ? node.mtime.getTime() : 0) : (key === 'size' ? (node.size || 0) : String(node.basename || '').toLowerCase()))
	return [...nodes].sort((a, b) => {
		if (options.sortFoldersFirst && a.type !== b.type) {
			return a.type === FileType.Folder ? -1 : 1
		}
		const va = value(a)
		const vb = value(b)
		return (va < vb ? -1 : (va > vb ? 1 : 0)) * dir
	})
}

function formatFileSize(size) {
	const n = Number(size) || 0
	if (n < 1024) {
		return `${n} B`
	}
	if (n < 1024 * 1024) {
		return `${(n / 1024).toFixed(1)} KB`
	}
	return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

module.exports = { FileType, View, getFileActions, getNewFileMenuEntries, sortNodes, formatFileSize }
