/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Helpers for `addFrom.resolve` on CnChildRecordsField: a row added from a
 * source record (a product) asks an app endpoint for the values the server
 * decides (the unit price for this quantity, the unit, the VAT rate), and the
 * answer is written into the row.
 *
 * @spec openspec/changes/child-records-resolve/tasks.md#task-1
 */

/**
 * Fill a request body template. A string value `@source` is the whole source
 * record, `@source.<key>` one of its values and `@row.<key>` one of the row's;
 * anything else is sent as written. A `@row.<key>` that is empty is left out,
 * so the endpoint's own default applies.
 *
 * @param {object} template The body template, e.g. `{ product: '@source', quantity: '@row.quantity' }`.
 * @param {{source?: object, row?: object}} ctx The source record and the row.
 * @return {object} The request body.
 * @spec openspec/changes/child-records-resolve/tasks.md#task-1
 */
export function resolveBody(template, ctx) {
	const body = {}
	for (const [key, value] of Object.entries(template || {})) {
		if (value === '@source') {
			body[key] = ctx?.source ?? null
			continue
		}
		if (typeof value === 'string' && value.startsWith('@source.')) {
			body[key] = ctx?.source?.[value.slice(8)] ?? null
			continue
		}
		if (typeof value === 'string' && value.startsWith('@row.')) {
			const rowValue = ctx?.row?.[value.slice(5)]
			if (rowValue !== undefined && rowValue !== null && rowValue !== '') {
				body[key] = rowValue
			}
			continue
		}
		body[key] = value
	}
	return body
}

/**
 * The row values an answer gives: per row key, the answer key named in
 * `map`. A key the answer does not carry is not written, so the row keeps
 * what it had.
 *
 * @param {object} answer The endpoint's answer.
 * @param {object} map Row key to answer key, e.g. `{ unitPrice: 'unitPrice', vatRate: 'taxRate' }`.
 * @return {object} The values to write into the row.
 * @spec openspec/changes/child-records-resolve/tasks.md#task-1
 */
export function patchFromAnswer(answer, map) {
	const patch = {}
	if (!answer || typeof answer !== 'object') {
		return patch
	}
	for (const [rowKey, answerKey] of Object.entries(map || {})) {
		if (answer[answerKey] !== undefined && answer[answerKey] !== null) {
			patch[rowKey] = answer[answerKey]
		}
	}
	return patch
}

/**
 * Whether an edit should ask the server again: one of the `when` keys
 * changed, and the user did not type a value of their own into a key the
 * answer writes (their value wins, so a manual price is never overwritten).
 *
 * @param {object} before The row before the edit.
 * @param {object} after The row after the edit.
 * @param {{when?: string[], map?: object}} resolve The resolve config.
 * @return {boolean}
 * @spec openspec/changes/child-records-resolve/tasks.md#task-2
 */
export function shouldResolveAgain(before, after, resolve) {
	const when = Array.isArray(resolve?.when) ? resolve.when : []
	const changed = (key) => String(before?.[key] ?? '') !== String(after?.[key] ?? '')
	if (!when.some(changed)) {
		return false
	}
	return !Object.keys(resolve?.map || {}).some(changed)
}

/**
 * The row key that holds the source record's id (the `map` entry `@id`), or null.
 *
 * @param {object} map The add-from map.
 * @return {string|null}
 * @spec openspec/changes/child-records-resolve/tasks.md#task-2
 */
export function sourceIdKey(map) {
	const entry = Object.entries(map || {}).find(([, sourceKey]) => sourceKey === '@id')
	return entry ? entry[0] : null
}
