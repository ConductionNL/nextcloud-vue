/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * stagesModel: the pure reasoning behind CnStagesWidget, kept out of the
 * component so it can be tested without a DOM.
 *
 * Two questions live here, and BOTH are about display or about writing a
 * record. Neither is about authorisation:
 *  - which stages the widget shows, in what order, and which of them close
 *    the record (`normalizeStages`);
 *  - what body the `field` opt-in saves (`stageSavePayload`).
 *
 * Which moves are ALLOWED is not decided here and never was a good fit for
 * this file. OpenRegister answers that at `/available-actions`, and
 * `useLifecycleTransitions` is the one place that asks. An earlier version of
 * this module mapped an app-specific availability answer through configurable
 * field names, which meant the guard could be misconfigured into silence; the
 * lifecycle contract cannot be.
 *
 * Every field name is configurable and defaults to a plain word, so an app
 * whose endpoint speaks another vocabulary maps it in the manifest instead of
 * wrapping the endpoint. Internal helper, not a public export.
 *
 * @module components/CnStagesWidget/stagesModel
 */

import { getByPath } from '../../composables/useEndpointSource.js'

/**
 * Read an id off a row, whichever shape OpenRegister or an app handed it in.
 *
 * @param {object} row The row.
 * @param {string} [idField] The configured id property.
 * @return {string} The id, or '' when the row has none.
 */
export function rowId(row, idField) {
	if (!row || typeof row !== 'object') {
		return ''
	}
	const configured = idField ? getByPath(row, idField) : undefined
	const id = configured ?? row.id ?? row['@self']?.id ?? row.uuid
	return (id === undefined || id === null) ? '' : String(id)
}

/**
 * Turn a label value into display text. A per-language map (an
 * `x-translatable` property) collapses to its first non-empty string.
 *
 * @param {unknown} value The raw label value.
 * @return {string} The text, or ''.
 */
export function labelText(value) {
	if (typeof value === 'string') {
		return value
	}
	if (typeof value === 'number') {
		return String(value)
	}
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const first = Object.values(value).find((v) => typeof v === 'string' && v !== '')
		return first || ''
	}
	return ''
}

/**
 * Whether a flag value means true. Accepts the shapes a JSON round trip or a
 * database column produces: `true`, `1`, `'1'`, `'true'`.
 *
 * @param {unknown} value The raw value.
 * @return {boolean} True when the flag is set.
 */
export function isTrue(value) {
	return value === true || value === 1 || value === '1' || value === 'true'
}

/**
 * Order and normalise stage rows into CnTimelineStages stages.
 *
 * Rows sort by `orderField` ascending when one is configured, with the id as
 * a tiebreak so two rows sharing an order never swap between renders. A row
 * with no order sorts last: an unnumbered stage is one nobody has placed yet,
 * and showing it first would misdescribe the process. Without `orderField`
 * the rows keep the order they arrived in.
 *
 * @param {Array<object>} rows The stage rows.
 * @param {{idField?: string, labelField?: string, descriptionField?: string, orderField?: string, finalField?: string}} [cfg] The field mapping.
 * @return {Array<{id: string, label: string, subtitle: string, final: boolean}>} The stages.
 */
export function normalizeStages(rows, cfg = {}) {
	const list = Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : []
	const orderField = cfg.orderField
	const orderOf = (row) => {
		const raw = getByPath(row, orderField)
		const n = (raw === null || raw === undefined || raw === '') ? NaN : Number(raw)
		return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
	}
	const ordered = orderField
		? [...list].sort((a, b) => (orderOf(a) - orderOf(b)) || rowId(a, cfg.idField).localeCompare(rowId(b, cfg.idField)))
		: list
	return ordered
		.map((row) => {
			const label = labelText(getByPath(row, cfg.labelField || 'name'))
				|| labelText(row.title)
				|| labelText(row.name)
			return {
				id: rowId(row, cfg.idField),
				label,
				subtitle: cfg.descriptionField ? labelText(getByPath(row, cfg.descriptionField)) : '',
				final: cfg.finalField ? isTrue(getByPath(row, cfg.finalField)) : false,
			}
		})
		.filter((stage) => stage.id !== '')
}

/**
 * Build the body a `field` transition saves the record with.
 *
 * The save is a PUT, so the record's own properties have to travel with it or
 * the write would clear them. Three shapes must NOT travel:
 *
 *  - `@self`, which is OpenRegister's server-owned metadata envelope and not a
 *    property of the record at all;
 *  - `null` and `{}`, which OpenRegister refuses on an object property. It
 *    says so by rejecting the whole write, so a record carrying one empty
 *    object property could not change its stage at all, and omitting the key
 *    is the documented answer.
 *
 * An empty ARRAY is deliberately NOT dropped, though an earlier version of
 * this did drop it. The justification above covers an object property, and an
 * array property holding `[]` is a different thing: a list somebody emptied on
 * purpose. Dropping it is only safe if this PUT replaces rather than merges,
 * and that is not something to assume from the client. If it merges, dropping
 * `[]` silently restores the values the person just removed, which is data
 * loss nobody sees. Sending it risks a refusal instead, which is loud, visible
 * and diagnosable. Between a silent wrong answer and a noisy one, take the
 * noise.
 *
 * `{ kind: 'field' }` is an explicit opt-in, NOT the registry default, which is
 * `{ kind: 'lifecycle' }`. Nothing validates this write, so an app reaches it
 * only by asking for it.
 *
 * @param {object} record The bound record.
 * @param {string} id The record's id, already resolved by the caller.
 * @param {string} field The property holding the stage.
 * @param {string} stageId The stage to move to.
 * @param {object} [extra] Extra keys to set, such as a comment or a result.
 * @return {object} The save body.
 */
export function stageSavePayload(record, id, field, stageId, extra = {}) {
	const payload = {}
	for (const [key, value] of Object.entries(record || {})) {
		if (key === '@self') {
			continue
		}
		if (value === null) {
			continue
		}
		if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
			continue
		}
		payload[key] = value
	}
	Object.assign(payload, extra)
	payload[field] = stageId
	payload.id = id
	return payload
}
