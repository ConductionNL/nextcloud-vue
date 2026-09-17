/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * Turn the sidebar's active filters into a named source's loader arguments.
 *
 * WHY A DECLARED MAP AND NOT A PASS-THROUGH. The sidebar speaks in schema
 * property names and arrays of chosen values. A source's endpoint speaks in
 * its own named arguments, and some of them are not one-to-one: a due window
 * is ONE sidebar field and TWO arguments (`dueAfter`, `dueBefore`). Handing
 * the raw filter map to the loader would send `dueAt=[a,b]`, which the inbox
 * neither knows nor refuses. It would answer the unfiltered list, and the
 * page would look filtered.
 *
 * WHY AN UNDECLARED FIELD IS LOUD. A filter with no mapping is a control
 * somebody put on screen that cannot narrow anything. That is the one
 * outcome worth a console error: it is invisible in the UI, because a filter
 * that does nothing renders exactly like one that matched everything.
 *
 * @spec openspec/changes/cn-task-search-fields/specs/cn-task-search-fields/spec.md
 */

/**
 * Whether a chosen value is worth sending.
 *
 * @param {unknown} value One value from the sidebar.
 *
 * @return {boolean} True when it narrows anything.
 */
function isMeaningful(value) {
	return value !== undefined && value !== null && String(value).trim() !== ''
}

/**
 * The chosen values for one field, as a flat array of strings.
 *
 * The sidebar emits an array for a multi-select and a bare value for the
 * single-valued controls, so both shapes arrive here.
 *
 * @param {unknown} raw The active filter entry.
 *
 * @return {Array<string>} The chosen values, empties dropped.
 */
function chosenValues(raw) {
	const list = Array.isArray(raw) ? raw : [raw]
	return list
		.map((value) => ((value && typeof value === 'object' && 'id' in value) ? value.id : value))
		.filter(isMeaningful)
		.map((value) => String(value))
}

/**
 * One field's contribution to the loader config.
 *
 * @param {string} key The sidebar field key.
 * @param {object} declaration The field's mapping declaration.
 * @param {unknown} raw The active filter entry for this field.
 *
 * @return {object} The arguments this field adds, possibly empty.
 */
function fieldParams(key, declaration, raw) {
	// A range is the one field that is TWO arguments. Its value is the
	// `{ from, to }` CnDateRangePicker emits, or a two-element array; either
	// half may be absent, and an open-ended window is a legitimate question.
	if (Array.isArray(declaration.range)) {
		const [fromParam, toParam] = declaration.range
		const value = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : null
		const from = value ? value.from : (Array.isArray(raw) ? raw[0] : null)
		const to = value ? value.to : (Array.isArray(raw) ? raw[1] : null)
		const out = {}
		if (isMeaningful(from)) {
			out[fromParam] = String(from)
		}
		if (isMeaningful(to)) {
			out[toParam] = String(to)
		}
		return out
	}

	const values = chosenValues(raw)
	if (values.length === 0) {
		return {}
	}

	const param = declaration.param || key

	// 🔴 A SINGLE-VALUED ARGUMENT TAKES THE FIRST CHOICE, NOT THE LAST.
	// `priority` and `objectUuid` are one value on the wire. Joining two into
	// a comma string would make the endpoint match a priority nobody has.
	if (declaration.single === true) {
		return { [param]: values[0] }
	}

	if (typeof declaration.join === 'string') {
		return { [param]: values.join(declaration.join) }
	}

	return { [param]: values }
}

/**
 * Map the sidebar's active filters onto a source's loader arguments.
 *
 * @param {object|null} searchFields The source's `searchFields` declaration,
 *   keyed by the sidebar field name. Each entry is one of
 *   `{ param, single }`, `{ param, join }` or `{ range: [fromParam, toParam] }`.
 * @param {object|null} activeFilters The sidebar's `{ key: values }` map.
 * @param {string} [sourceName] The source name, for the console error.
 *
 * @return {object} The loader arguments. Empty when nothing is chosen.
 */
export function searchFieldParams(searchFields, activeFilters, sourceName = '') {
	if (!activeFilters || typeof activeFilters !== 'object') {
		return {}
	}

	const declarations = (searchFields && typeof searchFields === 'object') ? searchFields : {}
	const out = {}

	for (const [key, raw] of Object.entries(activeFilters)) {
		const declaration = declarations[key]
		if (!declaration) {
			// Only an ACTIVE undeclared field is worth saying out loud: an
			// empty one narrows nothing either way, and warning on every
			// render would bury the case that matters.
			if (chosenValues(raw).length > 0 || (raw && typeof raw === 'object' && (raw.from || raw.to))) {
				// eslint-disable-next-line no-console
				console.error(`[CnIndexPage] entitySource "${sourceName}" has no inbox argument for the filter "${key}". The control is on screen and cannot narrow anything; declare it in the source's searchFields or take it off the sidebar.`)
			}
			continue
		}

		Object.assign(out, fieldParams(key, declaration, raw))
	}

	return out
}
