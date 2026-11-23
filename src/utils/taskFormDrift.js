// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * Check the fields a user-task step declares against the flow's subject
 * schema, with the three rules OpenRegister applies when a step is saved: the
 * field is absent from the schema, marked `readOnly`, or marked not visible
 * (`visible: false`).
 *
 * @param {object|null} schema The subject schema (`{ properties }`).
 * @param {Array<string|{field: string}>} fields The step's declared fields.
 * @return {Array<{field: string, reason: string}>} One entry per drifted field; empty without a schema.
 */
export function taskFormDrift(schema, fields) {
	const properties = schema && typeof schema === 'object' ? schema.properties : null
	if (!properties || typeof properties !== 'object' || !Array.isArray(fields)) {
		return []
	}
	const drift = []
	for (const entry of fields) {
		const field = typeof entry === 'string' ? entry : entry?.field
		if (!field) {
			continue
		}
		const prop = properties[field]
		if (!prop) {
			drift.push({ field, reason: 'absent' })
		} else if (prop.readOnly === true) {
			drift.push({ field, reason: 'readOnly' })
		} else if (prop.visible === false) {
			drift.push({ field, reason: 'hidden' })
		}
	}
	return drift
}
