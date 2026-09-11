/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * stagesModel: the pure reasoning behind CnStagesWidget, kept out of the
 * component so it can be tested without a DOM.
 *
 * Three questions live here:
 *  - which stages the widget shows, in what order, and which of them close
 *    the record (`normalizeStages`);
 *  - what an availability endpoint said about each stage: reachable or not,
 *    why not, and what a move needs from the person making it
 *    (`buildAvailability`);
 *  - what a refused move means in words (`refusalReason`).
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
	if (!row || typeof row !== 'object') return ''
	const configured = idField ? getByPath(row, idField) : undefined
	const id = configured ?? row.id ?? row['@self']?.id ?? row.uuid
	return (id === undefined || id === null) ? '' : String(id)
}

/**
 * Turn a label value into display text. A per-language map (an
 * `x-translatable` property) collapses to its first non-empty string.
 *
 * @param {*} value The raw label value.
 * @return {string} The text, or ''.
 */
export function labelText(value) {
	if (typeof value === 'string') return value
	if (typeof value === 'number') return String(value)
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
 * @param {*} value The raw value.
 * @return {boolean} True when the flag is set.
 */
export function isTrue(value) {
	return value === true || value === 1 || value === '1' || value === 'true'
}

/**
 * Whether a flag value means false.
 *
 * The counterpart of `isTrue`, and it exists for the same reason: a JSON
 * round trip, a database column or a form post produces `'false'`, `0` and
 * `'0'` where the schema said boolean. A guard that only recognises the
 * literal `false` treats every one of those as "not refused", which fails
 * OPEN. The shapes are listed here rather than inferred, so adding one is a
 * decision somebody makes on purpose.
 *
 * `undefined` and `null` are deliberately NOT false. An answer that does not
 * carry the flag at all has said nothing about the move, and "absent means
 * allowed" is what lets an endpoint that lists only the reachable stages keep
 * working.
 *
 * @param {*} value The raw value.
 * @return {boolean} True when the flag is explicitly off.
 */
export function isFalse(value) {
	return value === false || value === 0 || value === '0' || value === 'false'
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
 * Normalise result rows into `{ id, label }` choices.
 *
 * @param {Array<object>} rows The result rows.
 * @param {{idField?: string, labelField?: string}} [cfg] The field mapping.
 * @return {Array<{id: string, label: string}>} The choices.
 */
export function normalizeOptions(rows, cfg = {}) {
	if (!Array.isArray(rows)) return []
	return rows
		.filter((r) => r && typeof r === 'object')
		.map((row) => ({
			id: rowId(row, cfg.idField),
			label: labelText(getByPath(row, cfg.labelField || 'name')) || labelText(row.title) || labelText(row.name) || rowId(row, cfg.idField),
		}))
		.filter((option) => option.id !== '')
}

/**
 * Read an input declaration: `'required'`, `'optional'` (also `true`), or
 * '' for no input.
 *
 * @param {*} value The declared value.
 * @return {''|'optional'|'required'} The input mode.
 */
export function inputMode(value) {
	if (value === 'required') return 'required'
	if (value === 'optional' || isTrue(value)) return 'optional'
	return ''
}

/**
 * Map an availability answer onto stages.
 *
 * Each entry names the stage it reaches (`stageField`), the id the move is
 * sent under (`moveField`, defaulting to the stage id), whether it may be
 * taken (`allowedField`), why not (`reasonField`), and what it needs: a
 * comment (`commentField`), a result (`resultField`) and the results to
 * choose from (`resultOptionsField`).
 *
 * An explicit false in `allowedField` blocks a move, in any of the shapes
 * `isFalse` accepts: `false`, `0`, `'0'` and `'false'`. An answer that does
 * not carry the flag at all keeps working, and a move the server would refuse
 * is still refused by the server.
 *
 * When two entries reach the same stage, the first allowed one wins, so a
 * blocked route never hides an open one.
 *
 * @param {Array<object>} entries The availability entries.
 * @param {object} [cfg] The field mapping (see the component docs).
 * @return {Map<string, {moveId: string, allowed: boolean, reason: string, comment: (''|'optional'|'required'), result: (''|'optional'|'required'), resultOptions: Array<{id: string, label: string}>}>} Moves by stage id.
 */
export function buildAvailability(entries, cfg = {}) {
	const moves = new Map()
	if (!Array.isArray(entries)) return moves
	const stageField = cfg.stageField || 'stage'
	const allowedField = cfg.allowedField || 'allowed'
	const reasonField = cfg.reasonField || 'reason'
	const commentField = cfg.commentField || 'requiresComment'
	const resultField = cfg.resultField || 'requiresResult'
	const resultOptionsField = cfg.resultOptionsField || 'resultOptions'
	for (const entry of entries) {
		if (!entry || typeof entry !== 'object') continue
		const stage = getByPath(entry, stageField)
		if (stage === undefined || stage === null || stage === '') continue
		const stageId = String(stage)
		const moveRaw = cfg.moveField ? getByPath(entry, cfg.moveField) : undefined
		const allowed = !isFalse(getByPath(entry, allowedField))
		const move = {
			moveId: (moveRaw === undefined || moveRaw === null || moveRaw === '') ? stageId : String(moveRaw),
			allowed,
			reason: allowed ? '' : labelText(getByPath(entry, reasonField)).trim(),
			comment: inputMode(getByPath(entry, commentField)),
			// The SAME three-state mode as `comment`, not a boolean. Collapsing
			// it lost the difference between the two declarations that matter:
			// `'optional'` forced a result nobody asked for, and `'required'`
			// was indistinguishable from it.
			result: inputMode(getByPath(entry, resultField)),
			resultOptions: normalizeOptions(getByPath(entry, resultOptionsField), {
				idField: cfg.resultIdField,
				labelField: cfg.resultLabelField,
			}),
		}
		const existing = moves.get(stageId)
		if (!existing || (!existing.allowed && move.allowed)) moves.set(stageId, move)
	}
	return moves
}

/**
 * Build the body a `field` transition saves the record with.
 *
 * The save is a PUT, so the record's own properties have to travel with it or
 * the write would clear them. Three shapes must NOT travel:
 *
 *  - `@self`, which is OpenRegister's server-owned metadata envelope and not a
 *    property of the record at all;
 *  - `null`, `{}` and `[]`, which OpenRegister refuses on an object property.
 *    It says so by rejecting the whole write, so a record carrying one empty
 *    object property could not change its stage at all. Omitting the key is
 *    the documented answer, and an absent property and an empty one mean the
 *    same thing to OpenRegister, so nothing is lost by leaving it out.
 *
 * Because `{ kind: 'field' }` is the registry default, this is the path an app
 * gets without configuring anything.
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
		if (key === '@self') continue
		if (value === null) continue
		if (Array.isArray(value) && value.length === 0) continue
		if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue
		payload[key] = value
	}
	Object.assign(payload, extra)
	payload[field] = stageId
	payload.id = id
	return payload
}

/**
 * The words a refused move comes back with, from the error body.
 *
 * Reads `errorField` (a dot-path) first, then the usual `message` and
 * `error` keys. Returns '' when the body says nothing usable, so the caller
 * can fall back to its own sentence.
 *
 * @param {*} body The error response body.
 * @param {string} [errorField] The configured dot-path to the reason.
 * @return {string} The reason, or ''.
 */
export function refusalReason(body, errorField) {
	if (!body || typeof body !== 'object') return ''
	const candidates = [
		errorField ? getByPath(body, errorField) : undefined,
		body.message,
		body.error,
	]
	for (const candidate of candidates) {
		const text = labelText(candidate).trim()
		if (text) return text
	}
	return ''
}
