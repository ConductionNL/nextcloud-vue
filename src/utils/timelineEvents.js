/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Turn an object's dated facts into timeline events.
 *
 * Pure helpers behind `CnTimelineWidget`. An event is
 * `{ id, at, dateOnly, label, detail, source, upcoming }`, where `at` is a
 * `Date`, `dateOnly` says the source value carried no time of day, and
 * `upcoming` says the moment lies after `now`.
 *
 * @module utils/timelineEvents
 * @spec openspec/changes/timeline-widget/specs/timeline-widget/spec.md
 */

/**
 * Read a dotted path off an object (`@self.created`, `payment.clearedAt`).
 *
 * @param {object} obj The object.
 * @param {string} path The dotted path.
 * @return {unknown} The value, or undefined.
 */
export function readPath(obj, path) {
	if (!obj || typeof path !== 'string' || path === '') {
		return undefined
	}
	if (Object.hasOwn(obj, path)) {
		return obj[path]
	}
	return path.split('.').reduce((acc, part) => ((acc === null || acc === undefined) ? undefined : acc[part]), obj)
}

/**
 * Parse a stored date value. A bare `YYYY-MM-DD` is a calendar day and is
 * read as local midnight, not UTC, so it never shows as the day before.
 *
 * @param {unknown} raw The stored value.
 * @return {{at: Date, dateOnly: boolean}|null} The moment, or null when it is not a date.
 */
export function parseMoment(raw) {
	if (raw === undefined || raw === null || raw === '') {
		return null
	}
	if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		const [y, m, d] = raw.split('-').map(Number)
		return { at: new Date(y, m - 1, d), dateOnly: true }
	}
	const at = new Date(raw)
	return Number.isNaN(at.getTime()) ? null : { at, dateOnly: false }
}

/**
 * Build one event, or null when the value is not a date.
 *
 * @param {object} spec `{ id, raw, label, detail, source }`.
 * @param {Date} now The reference moment for `upcoming`.
 * @return {object|null} The event.
 */
function makeEvent(spec, now) {
	const moment = parseMoment(spec.raw)
	if (!moment) {
		return null
	}
	return {
		id: spec.id,
		at: moment.at,
		dateOnly: moment.dateOnly,
		label: spec.label || '',
		detail: spec.detail || '',
		source: spec.source,
		upcoming: moment.at.getTime() > now.getTime(),
	}
}

/**
 * Events from the object's own date properties.
 *
 * @param {object} object The object.
 * @param {Array<{field: string, label?: string}>} fields The configured date fields.
 * @param {Date} [now] The reference moment.
 * @return {Array<object>} One event per field that holds a date.
 */
export function fieldEvents(object, fields, now = new Date()) {
	return (Array.isArray(fields) ? fields : [])
		.filter((f) => f && typeof f.field === 'string')
		.map((f) => makeEvent({ id: `field:${f.field}`, raw: readPath(object, f.field), label: f.label || f.field, source: 'field' }, now))
		.filter(Boolean)
}

/**
 * Events from related objects: one per row that holds a date in `dateField`.
 *
 * @param {Array<object>} rows The related objects.
 * @param {{label?: string, dateField?: string, titleField?: string, schema?: string}} config The related-source config.
 * @param {Date} [now] The reference moment.
 * @return {Array<object>} The events.
 */
/**
 * The text at a path of a list entry, or '' when the path is unset or empty.
 *
 * @param {object} row The list entry.
 * @param {string|undefined} path The path to read.
 * @return {string} The text.
 */
function textAt(row, path) {
	if (!path) {
		return ''
	}
	const value = readPath(row, path)
	return value === null || value === undefined ? '' : String(value)
}

/**
 * Events from a list held on the object itself, such as a status history:
 * `[{ field, dateField, labelField?, label?, detailField? }]`. Each entry of the
 * list at `field` becomes one event, dated by `dateField`, labelled by its
 * `labelField` value (else `label`), with `detailField` as the line under it.
 *
 * @param {object} object The object.
 * @param {Array<object>} lists The list configs.
 * @param {Date} now The moment that separates past from upcoming.
 * @return {Array<object>} The events.
 * @spec openspec/changes/timeline-audit-trails-url/specs/timeline-widget/spec.md#requirement-a-list-on-the-object-becomes-dated-events
 */
export function listEvents(object, lists, now = new Date()) {
	return (Array.isArray(lists) ? lists : [])
		.filter((l) => l && typeof l.field === 'string' && typeof l.dateField === 'string')
		.flatMap((l) => {
			const rows = readPath(object, l.field)
			return (Array.isArray(rows) ? rows : []).map((row, i) => makeEvent({
				id: `list:${l.field}:${i}`,
				raw: readPath(row, l.dateField),
				label: textAt(row, l.labelField) || l.label || l.field,
				detail: textAt(row, l.detailField),
				source: 'list',
			}, now))
		})
		.filter(Boolean)
}

export function relatedEvents(rows, config, now = new Date()) {
	const cfg = config || {}
	const dateField = cfg.dateField || '@self.created'
	return (Array.isArray(rows) ? rows : [])
		.map((row, i) => {
			const self = (row && row['@self']) || {}
			const id = String(self.id || row.id || i)
			const title = cfg.titleField ? readPath(row, cfg.titleField) : (row && (row.title || row.name)) || self.name
			return makeEvent({
				id: `related:${cfg.schema || ''}:${id}`,
				raw: readPath(row, dateField),
				label: cfg.label || '',
				detail: title === undefined || title === null ? '' : String(title),
				source: 'related',
			}, now)
		})
		.filter(Boolean)
}

/**
 * Events from audit-trail entries.
 *
 * @param {Array<object>} entries The audit-trail rows.
 * @param {(action: string, actor: string) => string} describe Builds the label from action and actor.
 * @param {Date} [now] The reference moment.
 * @return {Array<object>} The events.
 */
export function auditEvents(entries, describe, now = new Date()) {
	return (Array.isArray(entries) ? entries : [])
		.map((e, i) => makeEvent({
			id: `audit:${e && (e.id || e.uuid) ? (e.id || e.uuid) : i}`,
			raw: e && (e.created || e.creationDateTime || e.timestamp),
			label: describe(String((e && (e.action || e.event)) || ''), String((e && (e.actorDisplayName || e.userName || e.user || e.actor)) || '')),
			source: 'audit',
		}, now))
		.filter(Boolean)
}

/**
 * Events from OpenRegister's timeline (notes, calls, messages).
 *
 * @param {Array<object>} entries The timeline rows.
 * @param {string} noteLabel The label for an entry without a kind.
 * @param {Date} [now] The reference moment.
 * @return {Array<object>} The events.
 */
export function timelineEntryEvents(entries, noteLabel, now = new Date()) {
	return (Array.isArray(entries) ? entries : [])
		.map((e, i) => makeEvent({
			id: `timeline:${e && e.id ? e.id : i}`,
			raw: e && e.created,
			label: (e && (e.kindTitle || e.kind)) || noteLabel,
			detail: [e && e.author, e && e.message].filter(Boolean).join(': '),
			source: 'timeline',
		}, now))
		.filter(Boolean)
}

/**
 * Sort events by time; ties keep their input order.
 *
 * @param {Array<object>} events The events.
 * @param {'asc'|'desc'} [order] Oldest first (default) or newest first.
 * @return {Array<object>} A new, sorted array.
 */
export function sortEvents(events, order = 'asc') {
	const dir = order === 'desc' ? -1 : 1
	return (events || [])
		.map((e, i) => ({ e, i }))
		.sort((a, b) => ((a.e.at.getTime() - b.e.at.getTime()) * dir) || (a.i - b.i))
		.map(({ e }) => e)
}
