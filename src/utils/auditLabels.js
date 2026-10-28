/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * auditLabels — what an audit entry says in words. Read by the History card
 * (CnAuditTrailCard) and the timeline (CnTimelineWidget), so one manifest
 * vocabulary (`actionLabels`, `changeLabels`, `valueLabels`) words both.
 */

import { readPath } from './readPath.js'
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * The new side of an `{ old, new }` pair, or the value itself.
 *
 * @param {unknown} value A recorded value.
 * @return {unknown} The new value.
 */
export function newValueOf(value) {
	return value !== null && typeof value === 'object' && Object.hasOwn(value, 'new') ? value.new : value
}

/**
 * A value the entry recorded under `changed`, in the words of `valueLabels`;
 * '' when it recorded none. A dotted key reads into what was recorded
 * (`data.fileName`); a pair reads as its new value unless the key names its
 * `old` or `new` side (`capacity.old`).
 *
 * @param {object} entry The audit entry.
 * @param {string} key The recorded key.
 * @param {{[key: string]: {[value: string]: string}}|null} [valueLabels] Words per key and value.
 * @return {string} The value in words.
 * @spec openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-timeline-says-what-an-audit-entry-changed-in-words
 */
export function changedValue(entry, key, valueLabels = null) {
	const changed = entry && typeof entry.changed === 'object' && entry.changed !== null ? entry.changed : {}
	const parts = String(key).split('.')
	let at = changed
	for (const part of parts) {
		if (at === null || typeof at !== 'object') {
			at = undefined
			break
		}
		const pair = Object.hasOwn(at, 'new') || Object.hasOwn(at, 'old')
		at = pair && part !== 'old' && part !== 'new' ? newValueOf(at)?.[part] : at[part]
	}
	const value = newValueOf(at)
	if (value === null || value === undefined || typeof value === 'object') {
		return ''
	}
	const base = parts.filter((part) => part !== 'old' && part !== 'new').join('.')
	const words = valueLabels && (valueLabels[key] || valueLabels[base])
	return words && typeof words[value] === 'string' ? words[value] : String(value)
}

/**
 * The `changeLabels` rule an entry matches: the first whose field the entry
 * changed, for its action and to its value when the rule names them.
 *
 * @param {object} entry The entry.
 * @param {Array<{action?: string, field: string, to?: unknown, label: string}>} rules The rules.
 * @return {string|null} The label, or null.
 */
export function changeLabelFor(entry, rules) {
	const changed = entry && typeof entry.changed === 'object' && entry.changed !== null ? entry.changed : {}
	const action = (entry && (entry.action || entry.event)) || ''
	for (const rule of Array.isArray(rules) ? rules : []) {
		if (!rule || typeof rule.label !== 'string' || rule.label === '' || typeof rule.field !== 'string' || !Object.hasOwn(changed, rule.field)) {
			continue
		}
		if (rule.action && rule.action !== action) {
			continue
		}
		if (Object.hasOwn(rule, 'to') && String(newValueOf(changed[rule.field])) !== String(rule.to)) {
			continue
		}
		return rule.label
	}
	return null
}

/**
 * The `actionLabels` entry for an entry: by action and state first, then by
 * action; a related record's entry (`relatedAs`) tries its prefixed keys first.
 * A label may be a list of `{ when?, text }`: the first entry whose local
 * visibleWhen condition holds for the record (one without `when` always does)
 * gives the words ("Event created in campaign …", else "Event created").
 *
 * @param {object} entry The entry.
 * @param {{[key: string]: string|Array<{when?: object, text: string}>}|null} labels The labels.
 * @param {object|null} [object] The record a label's condition reads.
 * @return {string|null} The label, or null.
 * @spec openspec/changes/audit-label-when/specs/audit-trail/spec.md#requirement-an-action-label-can-depend-on-the-record
 */
export function actionLabelFor(entry, labels, object = null) {
	const action = entry && (entry.action || entry.event)
	if (!labels || !action) {
		return null
	}
	const state = entry.stateAfter || ''
	const prefix = entry.relatedAs ? `${entry.relatedAs}.` : ''
	const label = (prefix ? (labels[`${prefix}${action}:${state}`] ?? labels[`${prefix}${action}`]) : undefined)
		?? labels[`${action}:${state}`] ?? labels[action]
	return labelForRecord(label, object)
}

/**
 * The words of a label for a record: a string as it is, or from a list of
 * `{ when?, text }` the first entry whose condition holds; null for none.
 *
 * @param {unknown} label The label.
 * @param {object|null} object The record.
 * @return {string|null} The words.
 */
function labelForRecord(label, object) {
	if (Array.isArray(label)) {
		const chosen = label.find((option) => option && typeof option.text === 'string' && option.text !== ''
			&& (!option.when || evaluateVisibleWhenLocal(option.when, object || {})))
		return chosen ? chosen.text : null
	}
	return typeof label === 'string' && label !== '' ? label : null
}

/**
 * Fill a label's tokens: `{actor}`, `{state}`, `{changed.<key>}` and
 * `{object.<path>}`.
 *
 * @param {string} label The label.
 * @param {object} entry The entry.
 * @param {{actor?: string, object?: object|null, valueLabels?: object|null}} [context] What the tokens read.
 * @return {string} The filled label.
 */
export function fillAuditLabel(label, entry, { actor = '', object = null, valueLabels = null } = {}) {
	return label
		.replace('{actor}', actor)
		.replace('{state}', (entry && entry.stateAfter) || '')
		.replace(/\{changed\.([\w.-]+)\}/g, (match, key) => changedValue(entry, key, valueLabels))
		.replace(/\{object\.([\w.-]+)\}/g, (match, path) => {
			const value = object ? readPath(object, path) : undefined
			return value === null || value === undefined || typeof value === 'object' ? '' : String(value)
		})
}

/**
 * What an entry says in words: its change label, else its action label,
 * filled; null when neither is declared.
 *
 * @param {object} entry The entry.
 * @param {{changeLabels?: Array<object>, actionLabels?: object|null, valueLabels?: object|null}} rules The labels.
 * @param {{actor?: string, object?: object|null}} [context] What the tokens read.
 * @return {string|null} The words, or null.
 * @spec openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-timeline-says-what-an-audit-entry-changed-in-words
 */
export function auditLabel(entry, rules, context = {}) {
	const label = changeLabelFor(entry, rules && rules.changeLabels) ?? actionLabelFor(entry, rules && rules.actionLabels, context.object || null)
	return label === null ? null : fillAuditLabel(label, entry, { ...context, valueLabels: rules && rules.valueLabels })
}
