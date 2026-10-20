/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { isBadgeVariant } from './badgeVariants.js'
import { pillLook } from './detailActionModel.js'
import { fillTemplate, firstFilled } from './fillTemplate.js'
import { readPath } from './readPath.js'

/**
 * The numbered list beside an index map (DqZakenKaart): one entry per row
 * that has a place on the map, numbered in list order so the number on the
 * pin and the number in the list are the same, and the rows without one.
 *
 * `spec` is `mapConfig.list`: `{ title, sub?, pills?: [{ path?, text?, map?,
 * formatter?, colorMap?, variant?, resolve? }], due? }`. `title`, `sub` and `due` are
 * field templates (`"{title}"`, `"{address} · {identifier}"`,
 * `"{deadline|date}"`), already translated by the caller; `sub` may list
 * several, the first that fills wins. A pill reads `path` (or shows `text`),
 * maps it through `map` or the app formatter `formatter` (a reference's
 * display name), and takes its tone from `colorMap` by the raw value, or,
 * with `resolve`, the tone and icon of the record the value points at
 * (`options.looks`, read by CnIndexPage as for its other pills).
 *
 * @param {Array<object>} rows The rows, in display order.
 * @param {object} spec The list declaration.
 * @param {object} options How to read a row.
 * @param {string} options.rowKey The row's key field.
 * @param {Function} options.located Whether a row has a place on the map.
 * @param {Function} [options.translate] The host's translate, for pill labels.
 * @param {object} [options.formatters] The app's named formatters, for pills and template tokens.
 * @param {object} [options.looks] The referenced records' looks by field and id (`{ [path]: { [id]: { color, icon } } }`).
 * @return {{items: Array<{key: string, n: number, row: object, title: string, sub: string, due: string, pills: Array<{label: string, variant: string}>}>, missing: Array<object>}}
 * @spec openspec/changes/map-list-formatters/specs/map-list-formatters/spec.md#requirement-a-map-list-reads-display-names-through-the-apps-formatters
 * @spec openspec/changes/map-list-formatters/specs/map-list-formatters/spec.md#requirement-a-map-list-pill-takes-its-tone-and-icon-from-the-referenced-record
 */
export function mapListItems(rows, spec, { rowKey, located, translate = (text) => text, formatters = null, looks = null }) {
	const context = formatters ? { formatters } : null
	const items = []
	const missing = []
	const list = spec && typeof spec === 'object' ? spec : {}
	for (const row of Array.isArray(rows) ? rows : []) {
		if (!located(row)) {
			missing.push(row)
			continue
		}
		const pills = (Array.isArray(list.pills) ? list.pills : [])
			.map((pill) => {
				if (!pill || typeof pill !== 'object') {
					return null
				}
				const raw = typeof pill.path === 'string' && pill.path !== '' ? readPath(row, pill.path) : undefined
				const formatter = typeof pill.formatter === 'string' && formatters ? formatters[pill.formatter] : null
				const formatted = typeof formatter === 'function' && (typeof raw === 'string' || typeof raw === 'number') && raw !== '' ? formatter(raw, row) : undefined
				const mapped = pill.map && (typeof raw === 'string' || typeof raw === 'number') && Object.hasOwn(pill.map, raw) ? pill.map[raw] : formatted
				const text = mapped ?? pill.text ?? raw
				if (typeof text !== 'string' && typeof text !== 'number') {
					return null
				}
				const label = translate(String(text))
				if (label === '') {
					return null
				}
				const tone = pill.colorMap && (typeof raw === 'string' || typeof raw === 'number') ? pill.colorMap[raw] : pill.variant
				const fieldLooks = pill.resolve && looks && typeof pill.path === 'string' ? looks[pill.path] : null
				const look = pillLook(fieldLooks && (typeof raw === 'string' || typeof raw === 'number') ? fieldLooks[String(raw)] : null)
				const variant = look.variant || tone
				return { label, variant: isBadgeVariant(variant) ? variant : 'default', ...(look.icon ? { icon: look.icon } : {}) }
			})
			.filter(Boolean)
		items.push({
			key: String(row[rowKey]),
			n: items.length + 1,
			row,
			title: fillTemplate(list.title || '', row, undefined, context),
			sub: list.sub ? firstFilled(list.sub, row, undefined, undefined, context) : '',
			due: fillTemplate(list.due || '', row, undefined, context),
			pills,
		})
	}
	return { items, missing }
}
