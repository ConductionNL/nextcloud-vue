/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { isBadgeVariant } from './badgeVariants.js'
import { fillTemplate } from './fillTemplate.js'
import { readPath } from './readPath.js'

/**
 * The numbered list beside an index map (DqZakenKaart): one entry per row
 * that has a place on the map, numbered in list order so the number on the
 * pin and the number in the list are the same, and the rows without one.
 *
 * `spec` is `mapConfig.list`: `{ title, sub?, pills?: [{ path?, text?, map?,
 * colorMap? }], due? }`. `title`, `sub` and `due` are field templates
 * (`"{title}"`, `"{address} · {identifier}"`, `"{deadline|date}"`), already
 * translated by the caller; a pill reads `path` (or shows `text`), maps it
 * through `map`, and takes its tone from `colorMap` by the raw value.
 *
 * @param {Array<object>} rows The rows, in display order.
 * @param {object} spec The list declaration.
 * @param {object} options How to read a row.
 * @param {string} options.rowKey The row's key field.
 * @param {Function} options.located Whether a row has a place on the map.
 * @param {Function} [options.translate] The host's translate, for pill labels.
 * @return {{items: Array<{key: string, n: number, row: object, title: string, sub: string, due: string, pills: Array<{label: string, variant: string}>}>, missing: Array<object>}}
 */
export function mapListItems(rows, spec, { rowKey, located, translate = (text) => text }) {
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
				const mapped = pill.map && (typeof raw === 'string' || typeof raw === 'number') && Object.hasOwn(pill.map, raw) ? pill.map[raw] : undefined
				const text = mapped ?? pill.text ?? raw
				if (typeof text !== 'string' && typeof text !== 'number') {
					return null
				}
				const label = translate(String(text))
				if (label === '') {
					return null
				}
				const tone = pill.colorMap && (typeof raw === 'string' || typeof raw === 'number') ? pill.colorMap[raw] : pill.variant
				return { label, variant: isBadgeVariant(tone) ? tone : 'default' }
			})
			.filter(Boolean)
		items.push({
			key: String(row[rowKey]),
			n: items.length + 1,
			row,
			title: fillTemplate(list.title || '', row),
			sub: fillTemplate(list.sub || '', row),
			due: fillTemplate(list.due || '', row),
			pills,
		})
	}
	return { items, missing }
}
