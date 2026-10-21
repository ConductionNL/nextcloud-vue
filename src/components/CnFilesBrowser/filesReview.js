/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { fileColumnValue } from './filesBrowserColumns.js'

/** The tones a review segment may take; anything else draws as `default`. */
const TONES = ['success', 'warning', 'error', 'info', 'default']

/**
 * The review summary of a file list (DqZaakDocumenten "4 van 7 beoordeeld"):
 * how many files carry each review value, read from the host's row data.
 *
 * `spec` is `{ key, open, values: [{ value, label?, tone? }] }`: `key` is the
 * row-data field that holds the review state, `open` the value (or values) of
 * a file still to review. A file with no value, or one not listed, counts as
 * open. Values compare without case.
 *
 * @param {object} spec The summary declaration.
 * @param {Array<object>} nodes The file nodes (folders already left out).
 * @param {object|null} rowData The host's row data, by file id.
 * @return {{total: number, done: number, open: number, segments: Array<{value: string, label: string, tone: string, count: number, share: number}>}|null}
 *   The counts, or null when the declaration names no key or no values.
 */
export function reviewSummary(spec, nodes, rowData) {
	if (!spec || typeof spec !== 'object' || typeof spec.key !== 'string' || spec.key === '' || !Array.isArray(spec.values) || spec.values.length === 0) {
		return null
	}
	const files = Array.isArray(nodes) ? nodes : []
	const openValues = (Array.isArray(spec.open) ? spec.open : [spec.open]).filter((v) => v !== undefined && v !== null).map((v) => String(v).toLowerCase())
	const segments = spec.values
		.filter((entry) => entry && entry.value !== undefined && entry.value !== null)
		.map((entry) => ({
			value: String(entry.value),
			label: typeof entry.label === 'string' && entry.label !== '' ? entry.label : String(entry.value),
			tone: TONES.includes(entry.tone) ? entry.tone : 'default',
			count: 0,
			share: 0,
		}))
	let open = 0
	for (const node of files) {
		const raw = fileColumnValue({ key: spec.key, source: 'row' }, node, rowData)
		const value = raw === null || raw === undefined ? '' : String(raw).toLowerCase()
		const segment = segments.find((s) => s.value.toLowerCase() === value)
		if (segment) {
			segment.count++
		}
		if (!segment || openValues.includes(value)) {
			open++
		}
	}
	const total = files.length
	for (const segment of segments) {
		segment.share = total > 0 ? Math.round((segment.count / total) * 1000) / 10 : 0
	}
	return { total, done: total - open, open, segments }
}
