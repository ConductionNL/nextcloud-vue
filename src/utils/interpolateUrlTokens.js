/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Interpolate `@page.<key>` / `@workspace.<key>` / `@config.<key>` /
 * `@objectId` / `@object.<field>` tokens inside a URL string against the
 * token context. `@page.*` is an alias for `@workspace.*` (both read the
 * page-level workspace context). Unresolved tokens collapse to an empty
 * string so a half-built URL never sends a literal `@page.period`. A query
 * parameter whose whole value is an optional token (`caseType=@workspace.caseType?`,
 * as `api-call` params write it) is left out while the token is empty.
 *
 * @param {string} str The raw URL (or any string) to interpolate.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object, range?: object}} [ctx] The token context.
 * @return {string} The interpolated string.
 */
export function interpolateUrlTokens(str, ctx) {
	if (typeof str !== 'string') {
		return str
	}
	const c = ctx || {}
	const workspace = c.workspace || {}
	const config = c.config || {}
	const empty = (v) => v === undefined || v === null || v === ''
	const optional = /([?&])([^=&#?]+)=@(page|workspace|config)\.([A-Za-z0-9_]+)\?(?=[&#]|$)/g
	let dropped = false
	str = str.replace(optional, (match, sep, key, ns, name) => {
		const v = ns === 'config' ? config[name] : workspace[name]
		if (empty(v)) {
			dropped = true
			return sep
		}
		return `${sep}${key}=@${ns}.${name}`
	})
	if (dropped) {
		str = str.replace(/\?&+/, '?').replace(/&{2,}/g, '&').replace(/[?&]+(?=#|$)/, '')
	}
	return str.replace(/@(page|workspace)\.([A-Za-z0-9_]+)/g, (_, _ns, key) => {
		const v = workspace[key]
		return (v === undefined || v === null) ? '' : String(v)
	}).replace(/@config\.([A-Za-z0-9_]+)/g, (_, key) => {
		const v = config[key]
		return (v === undefined || v === null) ? '' : String(v)
	}).replace(/@range\.([A-Za-z0-9_]+)/g, (_, key) => {
		const v = c.range && c.range[key]
		return (v === undefined || v === null) ? '' : String(v)
	}).replace(/@objectId/g, () => {
		const id = c.objectId
		return (id === undefined || id === null) ? '' : String(id)
	}).replace(/@object\.([A-Za-z0-9_]+)/g, (_, field) => {
		const v = c.object && c.object[field]
		return (v === undefined || v === null) ? '' : String(v)
	})
}
