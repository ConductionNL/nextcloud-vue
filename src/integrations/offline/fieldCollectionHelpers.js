/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pure helpers for the generic offline data-collection workflow.
 *
 * Checklist required-field validation, N/M progress counting, GPS-accuracy
 * classification and the user-facing sync-status copy. These are DOM-free and
 * carry no app-specific field names: the checklist shape (`items[]` with
 * `questionId` / `type` / `required`) is the generic contract a consuming app's
 * checklist schema/config supplies. Extracted from procest's
 * `fieldInspectionHelpers` so any app can reuse them.
 *
 * @module integrations/offline/fieldCollectionHelpers
 */

import { translate as t } from '@nextcloud/l10n'

/** Accuracy worse than this (metres) triggers the "poor signal" warning. */
export const GPS_POOR_ACCURACY_M = 50

/**
 * Classify a GPS fix into good / poor / sensorless and supply warning copy.
 *
 * @param {object|null} fix          The Geolocation reading.
 * @param {number}      [fix.accuracy] Accuracy in metres.
 * @param {boolean}     [available]  Whether the sensor produced any fix.
 *
 * @return {{ quality: ('good'|'poor'|'sensorless'), source: ('sensor'|'sensorless'), warning: (string|null) }}
 */
export function classifyGps(fix, available = true) {
	if (available === false || fix === null || fix === undefined) {
		return { quality: 'sensorless', source: 'sensorless', warning: null }
	}

	const accuracy = Number(fix.accuracy ?? Number.POSITIVE_INFINITY)
	if (accuracy > GPS_POOR_ACCURACY_M) {
		const rounded = Number.isFinite(accuracy) ? Math.round(accuracy) : '?'
		return {
			quality: 'poor',
			source: 'sensor',
			warning: t('nextcloud-vue', 'Location imprecise (±{m}m) — wait for a better signal or add the address manually', { m: rounded }),
		}
	}

	return { quality: 'good', source: 'sensor', warning: null }
}

/**
 * Validate a set of checklist answers against the template's required items.
 *
 * A `required` item must have a non-empty answer; a `photo_required` item must
 * additionally have at least one evidence reference. Returns the per-question
 * blocking errors so the UI can prevent save (and the engine never queues an
 * invalid result).
 *
 * @param {object} template          The checklist template (`items[]`).
 * @param {Array}  template.items     Items (`questionId`, `type`, `required`).
 * @param {object} answersByQuestion  Map of questionId → { answer, evidenceRefs }.
 *
 * @return {{ valid: boolean, errors: Array<{ questionId: string, message: string }> }}
 */
export function validateChecklistAnswers(template, answersByQuestion) {
	const items = Array.isArray(template?.items) ? template.items : []
	const answers = answersByQuestion ?? {}
	const errors = []

	for (const item of items) {
		if (item?.required !== true) {
			continue
		}
		const entry = answers[item.questionId] ?? {}
		const answer = entry.answer
		const evidenceRefs = Array.isArray(entry.evidenceRefs) ? entry.evidenceRefs : []

		if (item.type === 'photo_required') {
			if (evidenceRefs.length === 0) {
				errors.push({ questionId: item.questionId, message: t('nextcloud-vue', 'Photo required for this question') })
			}
			continue
		}

		if (answer === undefined || answer === null || String(answer).trim() === '') {
			errors.push({ questionId: item.questionId, message: t('nextcloud-vue', 'This question is required') })
		}
	}

	return { valid: errors.length === 0, errors }
}

/**
 * Count completed items in a checklist for the N/M progress indicator.
 *
 * @param {object} template          The checklist template.
 * @param {object} answersByQuestion  Map of questionId → { answer, evidenceRefs }.
 *
 * @return {{ done: number, total: number }} Completed and total item counts.
 */
export function checklistProgress(template, answersByQuestion) {
	const items = Array.isArray(template?.items) ? template.items : []
	const answers = answersByQuestion ?? {}
	let done = 0

	for (const item of items) {
		const entry = answers[item.questionId] ?? {}
		const hasAnswer = entry.answer !== undefined && entry.answer !== null && String(entry.answer).trim() !== ''
		const hasEvidence = Array.isArray(entry.evidenceRefs) && entry.evidenceRefs.length > 0
		if (item.type === 'photo_required' ? hasEvidence : hasAnswer) {
			done += 1
		}
	}

	return { done, total: items.length }
}

/**
 * Human-readable sync-status copy for the green/amber/red indicator.
 *
 * @param {number}  pendingCount The number of pending operations.
 * @param {boolean} online       Whether the device is online.
 *
 * @return {{ tone: ('success'|'warning'|'error'), text: string }} Indicator state.
 */
export function syncIndicator(pendingCount, online) {
	if (online === false) {
		return { tone: 'error', text: t('nextcloud-vue', 'Offline — {n} changes waiting for sync', { n: pendingCount }) }
	}
	if (pendingCount > 0) {
		return { tone: 'warning', text: t('nextcloud-vue', '{n} changes waiting for sync', { n: pendingCount }) }
	}
	return { tone: 'success', text: t('nextcloud-vue', 'All changes synced') }
}
