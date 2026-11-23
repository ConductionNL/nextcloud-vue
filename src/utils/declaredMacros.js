/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The macros an OpenRegister schema declares: declared actions
 * (`configuration['x-openregister-action']`) with `macro: true` and a bound
 * flow. A declared action without a flow is not a macro and is left out.
 */

/**
 * The macros a schema declares, in declaration order.
 *
 * @param {object|null} schema The schema, as OpenRegister returns it.
 * @return {Array<{key: string, name: string, description: string}>} The macros.
 */
export function declaredMacros(schema) {
	const declared = schema?.configuration?.['x-openregister-action']
	if (!declared || typeof declared !== 'object' || Array.isArray(declared)) {
		return []
	}
	return Object.entries(declared)
		.filter(([, entry]) => entry && typeof entry === 'object' && entry.macro === true && typeof entry.flow === 'string' && entry.flow !== '')
		.map(([key, entry]) => ({
			key,
			name: typeof entry.name === 'string' && entry.name !== '' ? entry.name : key,
			description: typeof entry.description === 'string' ? entry.description : '',
		}))
}

/**
 * The macros a record shows: every declared one, or, when the record names a
 * list (`macrosFrom`, a case type's own choice), those keys in its order.
 * A named list that is absent or empty shows none: a case type that chose no
 * macros has none, rather than every macro the shared schema declares.
 *
 * @param {Array<{key: string}>} declared The schema's macros (declaredMacros()).
 * @param {unknown} keys The list the record names, or undefined when it names none.
 * @param {boolean} named Whether the widget reads a list at all (`macrosFrom` is set).
 * @return {Array<{key: string, name: string, description: string}>} The macros to show.
 */
export function pickMacros(declared, keys, named) {
	if (!named) {
		return declared
	}
	if (!Array.isArray(keys)) {
		return []
	}
	return keys
		.map((key) => declared.find((macro) => macro.key === String(key)))
		.filter(Boolean)
}
