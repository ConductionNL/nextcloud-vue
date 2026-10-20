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
