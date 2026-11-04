/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * parentCrumb: the breadcrumb entry for the record a sub-record belongs to.
 *
 * A crumb that carries `parent` names a `visibilityContext` entry of the
 * detail page. The page reads that record beside the loaded one; this
 * helper turns it into a crumb with the parent's label and a link to its
 * page.
 *
 * @module utils/parentCrumb
 */

/**
 * Read a dotted path from an object.
 *
 * @param {object|null} obj The object to read.
 * @param {string} path A dotted path, e.g. `identifier` or `@self.name`.
 * @return {unknown} The value, or undefined.
 */
function readPath(obj, path) {
	return path.split('.').reduce((o, part) => (o === null || o === undefined ? undefined : o[part]), obj)
}

/**
 * A non-empty string for a value, or ''.
 *
 * @param {unknown} value Any value.
 * @return {string} The text.
 */
function text(value) {
	if (typeof value === 'number') {
		return String(value)
	}
	return typeof value === 'string' ? value.trim() : ''
}

/**
 * The crumb for a record's parent.
 *
 * The crumb is dropped (null) when the record holds no reference to a
 * parent. Its label is the parent's `labelField` value, else the parent's
 * name or title, else the crumb's own `label` (translated); without any of
 * those it is dropped too. The link goes to `route` with the parent's id in
 * `param` (default `id`), or to `href` with `{id}` filled in.
 *
 * @param {object} crumb `{ parent, labelField?, label?, route?, params?, param?, href?, icon? }`.
 * @param {Array<{key: string, id: string}>} refs The page's context references.
 * @param {object} rows The context records read so far, by name.
 * @param {(key: string) => string} translate The host translate function.
 * @return {{label: string, to?: object, href?: string, icon?: string}|null} The crumb, or null.
 * @spec openspec/changes/detail-parent-crumb/specs/detail-page/spec.md#requirement-a-sub-record-trail-can-show-its-parent-record
 */
export function parentCrumb(crumb, refs, rows, translate) {
	const ref = (refs || []).find((r) => r.key === crumb.parent)
	if (!ref || !ref.id) {
		return null
	}
	const row = rows && rows[crumb.parent] && typeof rows[crumb.parent] === 'object' ? rows[crumb.parent] : null
	let label = ''
	if (row) {
		label = (typeof crumb.labelField === 'string' && crumb.labelField !== '' ? text(readPath(row, crumb.labelField)) : '')
			|| text(readPath(row, '@self.name')) || text(row.name) || text(row.title)
	}
	if (label === '' && typeof crumb.label === 'string' && crumb.label !== '') {
		label = translate(crumb.label)
	}
	if (label === '') {
		return null
	}
	const entry = { label }
	if (typeof crumb.icon === 'string' && crumb.icon !== '') {
		entry.icon = crumb.icon
	}
	if (crumb.route) {
		const param = typeof crumb.param === 'string' && crumb.param !== '' ? crumb.param : 'id'
		entry.to = { name: crumb.route, params: { ...(crumb.params || {}), [param]: ref.id } }
	} else if (typeof crumb.href === 'string' && crumb.href !== '') {
		entry.href = crumb.href.split('{id}').join(encodeURIComponent(ref.id))
	}
	return entry
}
