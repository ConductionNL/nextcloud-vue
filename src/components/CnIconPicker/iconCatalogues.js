/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Icon-catalogue adapters for `CnIconPicker`'s multi-source mode.
 *
 * The library imports NO icon pack itself — the consuming app owns (and
 * licenses) that choice and passes the raw source in. These helpers turn a
 * popular icon source into the catalogue shape the picker understands:
 *
 *   { key, label, value, search, path?, component? }
 *
 *   - `key`       stable identifier (the source's export/name)
 *   - `label`     human display name
 *   - `value`     what the picker emits when this icon is chosen
 *   - `search`    lowercased haystack for substring matching
 *   - `path`      SVG `d` string → rendered inline as `<svg><path>`
 *   - `component` Vue component → rendered via `<component :is>`
 *
 * An entry carries `path` OR `component`; the picker renders whichever exists.
 *
 * Licensing: FontAwesome and the OpenGemeenten set carry their own terms — see
 * the "Icon sets & licensing" section of the README. Passing a pack through
 * these adapters does not grant any rights; the consumer must confirm its own.
 */

/**
 * De-camelCase / de-kebab a raw identifier into spaced, title-cased words,
 * e.g. `mdiAccountCircle` → `Account Circle`, `address-book` → `Address Book`.
 *
 * @param {string} name the raw export name or icon name.
 * @return {string} the human display label.
 */
function humanize(name) {
	return String(name)
		.replace(/^mdi/, '')
		.replace(/[-_]+/g, ' ')
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Deduplicate catalogue entries by `value`, keeping first occurrence and
 * dropping entries without a value.
 *
 * @param {Array<object>} entries the entries to dedupe.
 * @return {Array<object>} a new, de-duplicated array.
 */
export function dedupeCatalogue(entries) {
	const seen = new Set()
	const out = []
	for (const entry of entries || []) {
		if (!entry || entry.value == null || entry.value === '') {
			continue
		}
		const value = String(entry.value)
		if (seen.has(value)) {
			continue
		}
		seen.add(value)
		out.push(entry)
	}
	return out
}

/**
 * Adapt the `@mdi/js` module (a map of `mdiXxx` export → SVG path string) into
 * a catalogue. The emitted `value` is the export name (e.g. `'mdiAccount'`);
 * the `path` is the SVG `d` string.
 *
 * @param {Record<string, string>} mdiModule the `@mdi/js` module namespace.
 * @return {Array<object>} the catalogue, sorted by label.
 */
export function fromMdiJs(mdiModule) {
	const entries = Object.keys(mdiModule || {})
		.filter((key) => key.startsWith('mdi') && typeof mdiModule[key] === 'string')
		.map((key) => ({
			key,
			label: humanize(key),
			value: key,
			search: humanize(key).toLowerCase() + ' ' + key.toLowerCase(),
			path: mdiModule[key],
			viewBox: '0 0 24 24',
		}))
		.sort((a, b) => a.label.localeCompare(b.label))
	return dedupeCatalogue(entries)
}

/**
 * Adapt FontAwesome packs into a catalogue. Each pack (`fas`/`far`/`fab`) is a
 * map of `faXxx` export → icon definition `{ iconName, icon: [w, h, ligs, uni,
 * pathData] }`. The emitted `value` is the FA `iconName` (e.g. `'house'`); the
 * `path` is the definition's SVG path (the first string if `pathData` is an
 * array of layers). Entries are deduplicated by value across the packs, in the
 * order the packs are given.
 *
 * @param {{fas?: object, far?: object, fab?: object}} packs the imported packs.
 * @return {Array<object>} the deduplicated catalogue, sorted by label.
 */
export function fromFontAwesome(packs = {}) {
	const fromPack = (pack) => Object.values(pack || {})
		.filter((def) => def && typeof def === 'object' && 'iconName' in def)
		.map((def) => {
			const pathData = def.icon && def.icon[4]
			const width = (def.icon && def.icon[0]) || 512
			const height = (def.icon && def.icon[1]) || 512
			return {
				key: String(def.iconName),
				label: humanize(def.iconName),
				value: String(def.iconName),
				search: String(def.iconName).toLowerCase(),
				path: Array.isArray(pathData) ? pathData[pathData.length - 1] : pathData,
				viewBox: `0 0 ${width} ${height}`,
			}
		})
	const all = []
		.concat(fromPack(packs.fas))
		.concat(fromPack(packs.far))
		.concat(fromPack(packs.fab))
		.sort((a, b) => a.label.localeCompare(b.label))
	return dedupeCatalogue(all)
}

/**
 * Adapt an OpenGemeenten icon list into a catalogue. The library carries no
 * opengemeenten data — the consumer passes the icons it has loaded (from the
 * `@opengemeenten/iconset-web-component` package or the CC0 SVGs). Each item is
 * `{ name|key, label?, path?|d?|svg? }`. When only `svg` markup is supplied the
 * entry is emitted with that markup as `component: null` + `path` extracted
 * where possible; otherwise the raw `path`/`d` is used.
 *
 * @param {Array<{name?: string, key?: string, label?: string, path?: string, d?: string, svg?: string}>} list the icon list.
 * @return {Array<object>} the deduplicated catalogue, sorted by label.
 */
export function fromOpenGemeenten(list = []) {
	const entries = (Array.isArray(list) ? list : [])
		.map((item) => {
			if (!item || typeof item !== 'object') {
				return null
			}
			const key = String(item.key ?? item.name ?? '')
			if (!key) {
				return null
			}
			const path = item.path ?? item.d ?? extractSvgPath(item.svg)
			return {
				key,
				label: item.label ? String(item.label) : humanize(key),
				value: key,
				search: (item.label ? String(item.label) : humanize(key)).toLowerCase() + ' ' + key.toLowerCase(),
				path,
				viewBox: item.viewBox || '0 0 24 24',
			}
		})
		.filter(Boolean)
		.sort((a, b) => a.label.localeCompare(b.label))
	return dedupeCatalogue(entries)
}

/**
 * Best-effort extraction of the first `<path d="…">` from an SVG string, used
 * by {@link fromOpenGemeenten} when a consumer supplies raw markup.
 *
 * @param {string|undefined} svg the SVG markup.
 * @return {string|undefined} the first path's `d` attribute, or undefined.
 */
function extractSvgPath(svg) {
	if (typeof svg !== 'string') {
		return undefined
	}
	const match = svg.match(/<path[^>]*\sd="([^"]+)"/i)
	return match ? match[1] : undefined
}
