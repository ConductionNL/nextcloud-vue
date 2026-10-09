/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Which schema properties can serve each role of a saved view's presentation
 * (OpenRegister `View.presentation`): the board's group field and card fields,
 * the calendar's date fields.
 *
 * @spec openspec/changes/view-presentation-picker/tasks.md#task-1
 */
import { translate as t } from '@nextcloud/l10n'

const SCALAR_TYPES = ['string', 'number', 'integer', 'boolean']

/** The most card fields a board card shows. */
export const MAX_CARD_FIELDS = 4

/**
 * Candidates per role for a schema.
 *
 * - group field: a string property with an `enum`, the property the schema's
 *   lifecycle (`x-openregister-lifecycle.field`) names as its state, or a
 *   relation to one object (`$ref`);
 * - card fields: any scalar property (the picker caps the choice at four);
 * - date fields: a property with `format` `date` or `date-time`.
 *
 * A type whose required role has no candidate carries a reason, so the picker
 * can show it disabled and say why. The server stays the authority.
 *
 * @param {object|null} schema A JSON Schema with `properties`.
 * @return {{group: Array<{key: string, label: string, values: (string[]|null)}>, card: Array<{key: string, label: string}>, date: Array<{key: string, label: string}>, reasons: {kanban: string, calendar: string}}} The candidates.
 */
export function presentationCandidates(schema) {
	const properties = (schema && typeof schema === 'object' && schema.properties && typeof schema.properties === 'object') ? schema.properties : {}
	const lifecycleField = schema && schema['x-openregister-lifecycle'] && typeof schema['x-openregister-lifecycle'].field === 'string'
		? schema['x-openregister-lifecycle'].field
		: ''
	const group = []
	const card = []
	const date = []
	for (const [key, prop] of Object.entries(properties)) {
		if (!prop || typeof prop !== 'object') {
			continue
		}
		const label = prop.title || key
		const isEnum = prop.type === 'string' && Array.isArray(prop.enum) && prop.enum.length > 0
		const isRelation = typeof prop.$ref === 'string' && prop.$ref !== '' && prop.type !== 'array'
		if (isEnum || key === lifecycleField || isRelation) {
			group.push({ key, label, values: isEnum ? prop.enum.map(String) : null })
		}
		if (SCALAR_TYPES.includes(prop.type)) {
			card.push({ key, label })
		}
		if (prop.format === 'date' || prop.format === 'date-time') {
			date.push({ key, label })
		}
	}
	return {
		group,
		card,
		date,
		reasons: {
			kanban: group.length === 0 ? t('nextcloud-vue', 'This schema has no status or choice field to group by') : '',
			calendar: date.length === 0 ? t('nextcloud-vue', 'This schema has no date field') : '',
		},
	}
}

/**
 * Whether a presentation names what its type needs: a board a group field, a
 * calendar a date field. A table always does.
 *
 * @param {object|null} presentation The presentation in OpenRegister's shape.
 * @return {boolean} True when the server would not refuse it for a missing field.
 */
export function isPresentationComplete(presentation) {
	if (!presentation || presentation.viewType === 'table' || !presentation.viewType) {
		return true
	}
	if (presentation.viewType === 'kanban') {
		return !!(presentation.kanban && presentation.kanban.groupByField)
	}
	if (presentation.viewType === 'calendar') {
		return !!(presentation.calendar && presentation.calendar.dateField)
	}
	return false
}

/**
 * Route a refusal message to the picker it is about. OpenRegister names the
 * path (`kanban.groupByField`, `calendar.dateField`, `calendar.endDateField`),
 * which is part of its validation contract; this matches those literal tokens,
 * not the sentence around them.
 *
 * @param {string} message The server's message.
 * @return {string} The path found in the message, or '' when none is named.
 */
export function presentationErrorPath(message) {
	const found = ['kanban.groupByField', 'calendar.endDateField', 'calendar.dateField'].find((path) => String(message || '').includes(path))
	return found || ''
}
