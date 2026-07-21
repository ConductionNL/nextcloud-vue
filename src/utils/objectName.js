/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The display name of an OpenRegister object.
 */

/**
 * Read one field off an OpenRegister object, `@self` envelope included.
 *
 * @param {object} obj An OpenRegister object.
 * @param {string} key A field key. Dot notation ('address.city') walks nested objects.
 * @return {*} The value, or undefined when the object carries no such field.
 */
export function objectFieldValue(obj, key) {
	if (!obj || typeof key !== 'string') return undefined
	if (key.includes('.')) {
		return key.split('.').reduce((o, k) => o?.[k], obj)
	}
	// A flat key falls back to the `@self` envelope, so `name` resolves to `@self.name`
	// on a schema that has no top-level `name`. Mirrors CnDataTable.getCellValue() —
	// the two must agree, or a column can render a value the widget thinks is absent.
	if (obj[key] === undefined && obj['@self'] && typeof obj['@self'] === 'object') {
		return obj['@self'][key]
	}
	return obj[key]
}

/**
 * The human-readable name of an OpenRegister object.
 *
 * OpenRegister derives a display name for every object and puts it on the envelope as
 * `@self.name` — it guesses from whichever property the schema actually uses, so the
 * frontend does not have to. Prefer it over sniffing the object's own fields: a Cow may
 * carry `name`, a Barn `title`, a Case `reference`, and only the backend knows which.
 *
 * Generic widgets (tables, maps, pickers) that need "what do I call this thing" should
 * come here rather than hard-coding a key. A widget defaulting to `title` on a schema
 * whose objects have `name` renders a column of em-dashes and tells the user nothing.
 *
 * @param {object} obj An OpenRegister object (with or without its `@self` envelope).
 * @return {string} The display name, or '' when the object carries nothing nameable.
 */
export function objectDisplayName(obj) {
	if (!obj || typeof obj !== 'object') return ''

	const self = (obj['@self'] && typeof obj['@self'] === 'object') ? obj['@self'] : {}

	// @self.name first — it is the backend's answer, and it is right for every schema.
	// The rest are for objects handed to us outside an OpenRegister response (inline
	// GeoJSON features, test fixtures) that never had an envelope.
	const candidates = [self.name, obj.name, obj.title, self.id, obj.id]
	for (const c of candidates) {
		if (typeof c === 'string' && c.trim() !== '') return c
		if (typeof c === 'number') return String(c)
	}
	return ''
}
