/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a finished offline checklist run turns into in the queue.
 *
 * Two shapes, chosen by the leaf's `offlineConfig`:
 *
 * - `resultEndpoint` empty: an object create on `resultSchema`, the shape the
 *   leaf has always queued (`inspectionRef`, `checklistTemplateRef`,
 *   `items[]` with `questionId` / `answer` / `evidenceRefs`).
 * - `resultEndpoint` set: a `submit` operation that replays the run as ONE
 *   POST to an app's own endpoint, for an app that stores a run as something
 *   other than a plain object (a completed task, say) and checks the run
 *   server side before it stores anything. The endpoint is a path under the
 *   Nextcloud root with `{field}` placeholders filled from the planned item,
 *   e.g. `/apps/myapp/api/cases/{caseRef}/checklist-run`.
 *
 * Pure: no axios, no IndexedDB, no DOM. The card queues what this returns and
 * the replay service sends it.
 *
 * @module integrations/offline/checklistSubmission
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * Fill a `{field}` endpoint template from a planned item.
 *
 * Each value is URL-encoded, so a planned item can never steer the request to
 * another path. A placeholder the item does not fill is an error rather than
 * an empty path segment: a run sent to the wrong case is worse than one that
 * waits.
 *
 * @param {string} template    The endpoint template.
 * @param {object} plannedItem The planned item the run belongs to.
 *
 * @return {string} The filled path.
 *
 * @throws {Error} When a placeholder has no value on the item.
 */
export function fillEndpoint(template, plannedItem) {
	return String(template).replace(/\{([A-Za-z0-9_.]+)\}/g, (match, field) => {
		const value = field.split('.').reduce((node, key) => (node === null || node === undefined ? undefined : node[key]), plannedItem)
		if (value === undefined || value === null || String(value) === '') {
			throw new Error(t('nextcloud-vue', 'This planned item has no {field}, so the answers have nowhere to go.', { field }))
		}
		return encodeURIComponent(String(value))
	})
}

/**
 * The id of an object, wherever OpenRegister carries it.
 *
 * @param {object|null} object The object.
 *
 * @return {string} The id, or an empty string.
 */
function idOf(object) {
	return String(object?.id ?? object?.['@self']?.id ?? object?.uuid ?? '')
}

/**
 * Build the queue operation for a finished checklist run.
 *
 * @param {object}      config                  The leaf's offline config.
 * @param {object}      run                     The run.
 * @param {object}      run.plannedItem         The planned item.
 * @param {object}      run.template            The normalised template (`items[]`).
 * @param {object}      run.answers             Map of questionId to `{ answer, evidenceRefs }`.
 * @param {object|null} [run.gps]               The GPS fix at save, or null.
 * @param {string}      [run.gpsSource]         `sensor` or `sensorless`.
 * @param {string}      [run.capturedAt]        ISO time of the save.
 * @param {boolean}     [run.capturedOffline]   Whether the device was offline at save.
 *
 * @return {{ operationType: string, schema: string, endpoint: (string|null), payload: object }}
 *   The operation fields for `enqueueMutation`.
 *
 * @throws {Error} When the endpoint cannot be filled from the planned item.
 */
export function buildChecklistSubmission(config, run) {
	const capturedAt = run.capturedAt || new Date().toISOString()
	const gpsAtAnswer = run.gps ? { ...run.gps, source: run.gpsSource || 'sensor' } : { source: 'sensorless' }
	const items = Array.isArray(run.template?.items) ? run.template.items : []
	const answers = run.answers ?? {}
	const plannedItemId = idOf(run.plannedItem)
	const templateId = idOf(run.template)

	if (!config.resultEndpoint) {
		return {
			operationType: 'create',
			schema: config.resultSchema,
			endpoint: null,
			payload: {
				inspectionRef: plannedItemId,
				checklistTemplateRef: templateId,
				items: items.map((q) => ({
					questionId: q.questionId,
					answer: answers[q.questionId]?.answer,
					evidenceRefs: answers[q.questionId]?.evidenceRefs ?? [],
					answeredAt: capturedAt,
					gpsAtAnswer,
				})),
			},
		}
	}

	const payload = {
		[config.resultTemplateParam || 'templateId']: templateId,
		[config.resultPlannedItemParam || 'plannedItem']: plannedItemId,
		capturedAt,
		capturedOffline: run.capturedOffline === true,
		items: items
			.filter((q) => {
				const entry = answers[q.questionId] ?? {}
				const hasAnswer = entry.answer !== undefined && entry.answer !== null && String(entry.answer).trim() !== ''
				return hasAnswer || (Array.isArray(entry.evidenceRefs) && entry.evidenceRefs.length > 0)
			})
			.map((q) => ({
				itemId: q.questionId,
				value: answers[q.questionId]?.answer ?? '',
				photos: answers[q.questionId]?.evidenceRefs ?? [],
				answeredAt: capturedAt,
				gpsAtAnswer,
			})),
	}
	if (run.gps) {
		payload.location = { ...run.gps, source: run.gpsSource || 'sensor' }
	}

	return {
		operationType: 'submit',
		schema: config.resultSchema || '',
		endpoint: fillEndpoint(config.resultEndpoint, run.plannedItem),
		payload,
	}
}
