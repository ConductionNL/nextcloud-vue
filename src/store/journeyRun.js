/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The journey run store: the one place a journey's answers are written.
 * Components never call the run API; they call this.
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-3
 */

import { reactive } from 'vue'
import { cnFetchJson } from '../utils/cnFetch.js'

/**
 * Create a run store bound to OpenRegister's journey-run API.
 *
 * The run is created on the first saved step, so looking at a journey writes
 * nothing. Each completed step is saved with its answers and the next position,
 * so closing a dialog or leaving the page loses nothing: `resume(runId)`
 * restores the recorded step and answers in any host.
 *
 * @param {object} [options] Options.
 * @param {string} [options.endpoint] Run API base, `/apps/openregister/api/journey-runs`.
 * @param {string} [options.journeyId] The journey the run belongs to.
 * @return {object} `{ state, resume, save, submit, report }`.
 */
export function createJourneyRunStore(options = {}) {
	const base = (options.endpoint || '/apps/openregister/api/journey-runs').replace(/\/$/, '')
	const state = reactive({
		runId: null,
		journeyId: options.journeyId || null,
		answers: {},
		position: null,
		status: 'idle',
		failures: [],
		saving: false,
		error: null,
	})

	const json = (body) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

	return {
		state,

		/**
		 * Load a recorded run: its answers and the step it stopped at. Skips the
		 * request when this store already holds that run.
		 *
		 * @param {string} runId The run to resume.
		 * @return {Promise<void>}
		 */
		async resume(runId) {
			if (!runId || state.runId === runId) {
				return
			}
			state.status = 'loading'
			try {
				const run = await cnFetchJson(`${base}/${encodeURIComponent(runId)}`)
				state.runId = run.id || runId
				state.journeyId = run.journey || state.journeyId
				state.answers = run.answers && typeof run.answers === 'object' ? run.answers : {}
				state.position = run.position || null
				state.status = run.status || 'active'
			} catch (error) {
				state.status = 'error'
				state.error = error
				throw error
			}
		},

		/**
		 * Record a completed step's answers and where the filer goes next.
		 *
		 * @param {string} stepId The step that completed.
		 * @param {object} stepAnswers Its answers.
		 * @param {string|null} position The step to resume at.
		 * @return {Promise<void>}
		 */
		async save(stepId, stepAnswers, position) {
			state.answers = { ...state.answers, [stepId]: stepAnswers }
			state.position = position
			state.saving = true
			state.error = null
			try {
				const payload = { journey: state.journeyId, answers: state.answers, position, status: 'active' }
				if (state.runId === null) {
					const run = await cnFetchJson(base, { method: 'POST', ...json(payload) })
					state.runId = run.id
				} else {
					await cnFetchJson(`${base}/${encodeURIComponent(state.runId)}`, { method: 'PUT', ...json(payload) })
				}
				state.status = 'active'
			} catch (error) {
				state.error = error
				throw error
			} finally {
				state.saving = false
			}
		},

		/**
		 * Submit the run: the server performs the journey's writes.
		 *
		 * @return {Promise<object>} The server's result.
		 */
		async submit() {
			if (state.runId === null) {
				throw new Error('The journey has no saved answers to submit.')
			}
			state.saving = true
			try {
				const result = await cnFetchJson(`${base}/${encodeURIComponent(state.runId)}/submit`, { method: 'POST', ...json({}) })
				state.status = 'submitted'
				return result
			} catch (error) {
				state.error = error
				throw error
			} finally {
				state.saving = false
			}
		},

		/**
		 * Record that a branch rule could not be evaluated (the default step was
		 * used). Kept on the run; sent best-effort when a run exists.
		 *
		 * @param {Error} error Why the rule failed.
		 * @param {object} condition The rule's condition.
		 * @return {Promise<void>}
		 */
		async report(error, condition) {
			const failure = { message: error && error.message ? error.message : String(error), condition }
			state.failures = [...state.failures, failure]
			if (state.runId !== null) {
				try {
					await cnFetchJson(`${base}/${encodeURIComponent(state.runId)}/failures`, { method: 'POST', ...json(failure) })
				} catch {
					// The failure stays on the store; reporting it must not stop the filer.
				}
			}
		},
	}
}
