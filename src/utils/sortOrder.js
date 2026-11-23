/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Read an order a manifest writes into the `[{ key, order }]` list a self-fetch
 * index page sorts by. Accepted forms:
 *
 * - `"title"` ascending, `"-createdAt"` descending, `"priority:desc"`;
 * - several of those, comma separated, in priority order (`"-priority,title"`);
 * - an OpenRegister `_order` map, `{ "priority": "desc", "title": "asc" }`;
 * - a `[{ key, order? }]` list.
 *
 * @param {string|object|Array|null|undefined} value The order.
 * @return {Array<{key: string, order: 'asc'|'desc'}>} The sort keys, possibly empty.
 */
export function orderToSortKeys(value) {
	const direction = (order) => (String(order || '').toLowerCase() === 'desc' ? 'desc' : 'asc')
	if (Array.isArray(value)) {
		return value
			.filter((entry) => entry && typeof entry.key === 'string' && entry.key !== '')
			.map((entry) => ({ key: entry.key, order: direction(entry.order) }))
	}
	if (value && typeof value === 'object') {
		return Object.entries(value)
			.filter(([key]) => key !== '')
			.map(([key, order]) => ({ key, order: direction(order) }))
	}
	if (typeof value !== 'string') {
		return []
	}
	return value.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			if (part.startsWith('-')) {
				return { key: part.slice(1), order: 'desc' }
			}
			const [key, order] = part.split(':')
			return { key, order: direction(order) }
		})
		.filter((entry) => entry.key !== '')
}

/**
 * Whether two sort key lists order the same way.
 *
 * @param {Array<{key: string, order: string}>} a One list.
 * @param {Array<{key: string, order: string}>} b The other.
 * @return {boolean} True when they name the same keys, directions and priority.
 */
export function sameSortKeys(a, b) {
	const left = Array.isArray(a) ? a : []
	const right = Array.isArray(b) ? b : []
	return left.length === right.length
		&& left.every((entry, index) => entry.key === right[index].key && (entry.order || 'asc') === (right[index].order || 'asc'))
}

/**
 * The same keys, each direction turned round.
 *
 * @param {Array<{key: string, order?: string}>} keys The sort keys.
 * @return {Array<{key: string, order: 'asc'|'desc'}>} The reversed keys.
 */
export function reverseSortKeys(keys) {
	return (Array.isArray(keys) ? keys : []).map((entry) => ({ key: entry.key, order: entry.order === 'desc' ? 'asc' : 'desc' }))
}
