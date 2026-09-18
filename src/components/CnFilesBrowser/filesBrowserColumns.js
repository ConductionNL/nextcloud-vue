/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * The built-in columns a host may name by string, and what each one reads.
 *
 * `nodeKey` is the property on the @nextcloud/files node. `sortKey` is what
 * `sortNodes` understands, so a built-in sorts the way the Files app sorts;
 * a built-in with no `sortKey` sorts client-side like a declared column.
 *
 * @type {object}
 */
export const BUILT_IN_FILE_COLUMNS = {
	name: { key: 'name', source: 'node', nodeKey: 'basename', sortKey: 'basename', sortable: true },
	size: { key: 'size', source: 'node', nodeKey: 'size', sortKey: 'size', sortable: true },
	modified: { key: 'modified', source: 'node', nodeKey: 'mtime', sortKey: 'mtime', sortable: true },
	owner: { key: 'owner', source: 'node', nodeKey: 'owner', sortable: true },
	type: { key: 'type', source: 'node', nodeKey: 'mime', sortable: true },
	tags: { key: 'tags', source: 'node', nodeKey: 'attributes.system-tags', sortable: false },
}

/**
 * The columns a browser shows when its host declares none: what the table has
 * always shown, in the order it has always shown it.
 *
 * @type {string[]}
 */
export const DEFAULT_FILE_COLUMNS = ['name', 'size', 'modified']

/**
 * Read a dotted path off a node without throwing on a missing segment.
 *
 * @param {object} node The node.
 * @param {string} path A dotted path.
 * @return {(Array|object|string|number|boolean|undefined)} The value.
 */
function atPath(node, path) {
	if (!node || typeof path !== 'string' || path === '') {
		return undefined
	}
	return path.split('.').reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), node)
}

/**
 * Whether a string names a built-in column.
 *
 * @param {string} name The candidate name.
 * @return {boolean} True when it is a built-in.
 */
export function isBuiltInFileColumn(name) {
	return typeof name === 'string' && Object.hasOwn(BUILT_IN_FILE_COLUMNS, name)
}

/**
 * Resolve a host's `columns` declaration into column objects.
 *
 * A string names a built-in. An object declares its own: `key`, `label`,
 * `source` (`node`, `attribute` or `row`), `attribute`, `formatter` and
 * `sortable`. An entry naming an unknown built-in is dropped here and refused
 * by the manifest validator, so an author hears about it at authoring time
 * rather than finding a column missing at runtime.
 *
 * @param {(Array|null|undefined)} columns The declaration, or nothing.
 * @return {Array<object>} The resolved columns, in the declared order.
 */
export function normaliseFileColumns(columns) {
	const declared = Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_FILE_COLUMNS
	const out = []
	declared.forEach((entry) => {
		if (typeof entry === 'string') {
			if (isBuiltInFileColumn(entry)) {
				out.push({ ...BUILT_IN_FILE_COLUMNS[entry], builtIn: true })
			}
			return
		}
		if (!entry || typeof entry !== 'object' || typeof entry.key !== 'string' || entry.key === '') {
			return
		}
		if (isBuiltInFileColumn(entry.key) && entry.source === undefined) {
			out.push({ ...BUILT_IN_FILE_COLUMNS[entry.key], ...entry, builtIn: true })
			return
		}
		out.push({
			source: 'node',
			sortable: false,
			...entry,
			builtIn: false,
		})
	})
	return out
}

/**
 * The columns a browser renders: the host's declaration, narrowed by what this
 * user chose to see.
 *
 * Which side wins on what:
 *
 * - The HOST decides MEMBERSHIP. The result is built by walking the
 *   declaration, so a column exists only because the host declared it, in the
 *   order the host declared it.
 * - The USER decides VISIBILITY, and only downward. A stored preference can
 *   hide a declared column; it can never add one. A key in the stored list
 *   that the host no longer declares is passed over, so unticking a column
 *   last month cannot bring it back once the host removed it, and neither can
 *   a preference written while a different column set was declared.
 *
 * A stored value of `null` is a user who has never chosen, which shows
 * everything. An empty list is a user who hid everything, which is a choice
 * and is honoured.
 *
 * @param {Array<object>} declared The resolved declared columns.
 * @param {(string[]|null|undefined)} visibleKeys The user's stored visible keys.
 * @return {Array<object>} The columns to render.
 */
export function visibleFileColumns(declared, visibleKeys) {
	const columns = Array.isArray(declared) ? declared : []
	if (!Array.isArray(visibleKeys)) {
		return columns
	}
	const wanted = new Set(visibleKeys)
	return columns.filter((column) => wanted.has(column.key))
}

/**
 * The DAV properties a declaration needs in the PROPFIND, so an `attribute`
 * column's value is there when the folder lists rather than one request later.
 *
 * @param {Array<object>} columns The resolved columns.
 * @return {string[]} The property names, deduplicated, in declaration order.
 */
export function attributePropertiesFor(columns) {
	const out = []
	;(Array.isArray(columns) ? columns : []).forEach((column) => {
		if (column && column.source === 'attribute' && typeof column.attribute === 'string' && column.attribute !== '') {
			if (!out.includes(column.attribute)) {
				out.push(column.attribute)
			}
		}
	})
	return out
}

/**
 * The value one column shows for one node.
 *
 * @param {object} column A resolved column.
 * @param {object} node The node.
 * @param {object} [rowData] The host's per-file data, keyed by file id.
 * @return {(Array|object|string|number|boolean|undefined)} The cell value.
 */
export function fileColumnValue(column, node, rowData = null) {
	if (!column || !node) {
		return undefined
	}
	if (column.source === 'attribute') {
		// Read the key directly, NOT through the dotted-path reader: a DAV
		// property name is `{http://owncloud.org/ns}av-status`, and splitting
		// that on dots looks for a property called `org/ns}av-status` inside
		// one called `owncloud`, which is undefined every time.
		const attributes = node.attributes
		return attributes && typeof attributes === 'object' ? attributes[column.attribute] : undefined
	}
	if (column.source === 'row') {
		const byId = rowData && typeof rowData === 'object' ? rowData : null
		if (!byId) {
			return undefined
		}
		const entry = byId[node.fileid] ?? byId[String(node.fileid)]
		return entry ? entry[column.key] : undefined
	}
	return atPath(node, column.nodeKey || column.key)
}

/**
 * Sort nodes on a declared column's resolved value, within the listed folder.
 *
 * Folders stay first, the way the Files app lists them and the way the
 * built-in sorts already do, so switching to a declared column does not
 * reshuffle the folders into the files.
 *
 * @param {Array<object>} nodes The nodes.
 * @param {object} column The resolved column.
 * @param {boolean} ascending Sort direction.
 * @param {object} [rowData] The host's per-file data.
 * @param {(node: object) => boolean} [isFolder] Whether a node is a folder.
 * @return {Array<object>} A new, sorted array.
 */
export function sortNodesByColumn(nodes, column, ascending, rowData = null, isFolder = () => false) {
	const list = Array.isArray(nodes) ? [...nodes] : []
	if (!column) {
		return list
	}
	const direction = ascending ? 1 : -1
	return list.sort((a, b) => {
		const folderA = isFolder(a)
		const folderB = isFolder(b)
		if (folderA !== folderB) {
			return folderA ? -1 : 1
		}
		const left = fileColumnValue(column, a, rowData)
		const right = fileColumnValue(column, b, rowData)
		const leftMissing = left === undefined || left === null || left === ''
		const rightMissing = right === undefined || right === null || right === ''
		// A value nobody filled in sorts last in BOTH directions. Letting it
		// ride to the top on a descending sort hides the rows that do carry
		// one, which is the opposite of what sorting was asked for.
		if (leftMissing !== rightMissing) {
			return leftMissing ? 1 : -1
		}
		if (leftMissing && rightMissing) {
			return 0
		}
		if (typeof left === 'number' && typeof right === 'number') {
			return (left - right) * direction
		}
		return String(left).localeCompare(String(right)) * direction
	})
}
