/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { defineStore } from 'pinia'

/**
 * The OpenRegister inbox read behind the `tasks` entity source.
 *
 * One endpoint for the whole fleet (ADR-098): every Conduction app runs its
 * human tasks on OpenRegister's one task store, so "what is waiting for me"
 * has a single answer per viewer and this store can be app-agnostic.
 *
 * @type {string}
 */
export const FLOW_TASKS_URL = '/apps/openregister/api/flow-tasks'

/**
 * The query parameters the inbox read accepts, and the ONLY ones this store
 * forwards. The list is an allowlist on purpose: the endpoint decides whose
 * inbox it answers from the session, and no config key may widen that. A
 * `uid` or `assignee` smuggled into the loader config is dropped here, so
 * "the source resolves the CURRENT user's inbox" is enforced structurally
 * rather than by convention.
 *
 * @type {string[]}
 */
// `isTerminal` is in the list because the SERVER has always accepted it
// (`TaskController`: "'true'|'false' to restrict on terminality") and only
// this allowlist withheld it. Without it an app cannot express "closed" or
// "my open work" as a scope tab: dossiq's task lenses are
// All / Mine / Unclaimed / Closed / Overdue, and two of those are exactly
// this filter. Boolean-ish, like `overdue`, so it is stringified on the way
// out.
// `kind` is in the list for the same reason `isTerminal` is: the server
// accepts it (`TaskController`: "Restrict to one kind of work") and only this
// allowlist would withhold it. A kind is what sort of work a task is, as the
// creating app named it, so it is the one filter that lets a Tasks page say
// "the reminders" without the engine learning what a reminder is. It widens
// nothing: it narrows within the inbox the session already decides.
const ALLOWED_PARAMS = ['scope', 'state', 'isTerminal', 'priority', 'kind', 'overdue', 'dueAfter', 'dueBefore', 'objectUuid', 'sort', 'limit', 'offset']

/**
 * The flat body `POST /api/flow-tasks` takes for a task on a record.
 *
 * Only the task entity's own keys are ever sent, and never `requester` or
 * `state`: OpenRegister pins the requester to the caller and refuses a
 * terminal state. A user task carries `assignee`; a group task carries
 * `performerType: "group"` with `candidateGroups` (a pool until someone claims
 * it), because the server defaults `performerType` to `user`.
 *
 * @param {object} data The task to create.
 * @param {string} data.title Required title.
 * @param {string} [data.description] Optional description.
 * @param {string} [data.dueAt] Optional due date, ISO 8601.
 * @param {{objectUuid: string, registerId: string, schemaId: string}} data.anchor The record the task hangs on.
 * @param {{kind: ('user'|'group'), id: string}|null} [data.assignee] A user, or a group as a pool.
 * @return {object} The request body.
 * @spec openspec/changes/tasks-tab-flow-task-source/tasks.md#task-1
 */
export function buildFlowTaskBody(data) {
	const body = { title: String(data.title || '').trim() }
	if (data.description) {
		body.description = data.description
	}
	if (data.dueAt) {
		body.dueAt = data.dueAt
	}
	const anchor = data.anchor || {}
	body.objectUuid = anchor.objectUuid
	body.registerId = anchor.registerId
	body.schemaId = anchor.schemaId
	if (data.assignee && data.assignee.id) {
		if (data.assignee.kind === 'group') {
			body.performerType = 'group'
			body.candidateGroups = [data.assignee.id]
		} else {
			body.assignee = data.assignee.id
		}
	}
	return body
}

/**
 * Read the server's message off a failed axios call.
 *
 * @param {object} error The axios error.
 * @return {string} The message, or ''.
 */
function serverMessage(error) {
	const data = error && error.response && error.response.data
	if (typeof data === 'string') {
		return data
	}
	return (data && (data.error || data.message)) || (error && error.message) || ''
}

/**
 * Internal Pinia store for the `tasks` index source (cn-tasks-entity-source).
 *
 * Deliberately NOT a public export: the public surface is the manifest line
 * (`entitySource: "tasks"`), and the adapter in `indexSources.js` is its only
 * consumer. Keeping the store internal leaves the HTTP contract in one file
 * should the endpoint move.
 *
 * @spec openspec/changes/cn-tasks-entity-source/specs/cn-tasks-entity-source/spec.md
 */
export const useTaskInboxStore = defineStore('cnTaskInbox', {
	state: () => ({
		/** @type {Array<object>} The inbox rows as the endpoint returned them. */
		tasks: [],
		/** @type {number} The datastore total, independent of the page size. */
		total: 0,
		/** @type {boolean} Whether a load is in flight. */
		loading: false,
		/** @type {string|null} The last load failure, for the console trail. */
		error: null,
	}),

	actions: {
		/**
		 * Read one inbox page WITHOUT touching the store's state, so a surface
		 * that lists a different slice (the Tasks tab of one record) cannot
		 * overwrite what an inbox page on the same screen shows.
		 *
		 * @param {object} [config] Loader config, as for `load`.
		 * @return {Promise<{results: Array<object>, total: number}>} The rows and the total.
		 * @spec openspec/changes/tasks-tab-flow-task-source/tasks.md#task-1
		 */
		async fetchFor(config = {}) {
			const params = { scope: 'assigned', sort: '-dueAt' }
			for (const key of ALLOWED_PARAMS) {
				const value = config ? config[key] : undefined
				if (value === undefined || value === null || value === '') {
					continue
				}
				params[key] = (key === 'overdue' || key === 'isTerminal') ? String(value) : value
			}
			const response = await axios.get(generateUrl(FLOW_TASKS_URL), { params })
			const results = response.data?.results || []
			return { results, total: Number(response.data?.total ?? results.length) || 0 }
		},

		/**
		 * Create a flow task. A refusal is returned, not thrown, with the
		 * server's message and the HTTP status (404: the creator may not read
		 * the record).
		 *
		 * @param {object} data See `buildFlowTaskBody`.
		 * @return {Promise<{ok: boolean, status: (number|null), task: (object|null), message: string}>} The outcome.
		 * @spec openspec/changes/tasks-tab-flow-task-source/tasks.md#task-1
		 */
		async createTask(data) {
			try {
				const response = await axios.post(generateUrl(FLOW_TASKS_URL), buildFlowTaskBody(data))
				return { ok: true, status: response.status || 201, task: response.data?.task || response.data || null, message: '' }
			} catch (error) {
				return { ok: false, status: error?.response?.status ?? null, task: null, message: serverMessage(error) }
			}
		},

		/**
		 * Run one lifecycle verb on a task (`claim`, `unclaim`, `reassign`,
		 * `complete`, `cancel`). A refusal is returned, not thrown, with the
		 * server's message, so the row can show it and stay as it was.
		 *
		 * @param {string} uuid The task uuid.
		 * @param {string} verb The verb.
		 * @param {object} [body] Optional body (for `reassign`: `{ assignee }`).
		 * @return {Promise<{ok: boolean, status: (number|null), task: (object|null), message: string}>} The outcome.
		 * @spec openspec/changes/tasks-tab-flow-task-source/tasks.md#task-1
		 */
		async runVerb(uuid, verb, body = {}) {
			try {
				const response = await axios.post(generateUrl(`${FLOW_TASKS_URL}/${encodeURIComponent(uuid)}/${encodeURIComponent(verb)}`), body || {})
				return { ok: true, status: response.status || 200, task: response.data?.task || response.data || null, message: '' }
			} catch (error) {
				return { ok: false, status: error?.response?.status ?? null, task: null, message: serverMessage(error) }
			}
		},

		/**
		 * Load one inbox page.
		 *
		 * Defaults are the inbox's resting shape: the viewer's ASSIGNED tasks,
		 * most urgent due date first (`-dueAt`). Every key is optional and
		 * only allowlisted keys are forwarded; filtering, sorting and paging
		 * are the server's, never applied over a returned page.
		 *
		 * @param {object} [config] Loader config from the page (`sourceConfig`
		 *   merged with the active quick-filter tab): `scope`, `state`,
		 *   `priority`, `kind`, `overdue`, `objectUuid`, `sort`, `limit`,
		 *   `offset`.
		 *
		 * @return {Promise<void>} Resolves when the rows are in the store.
		 *
		 * @spec openspec/changes/cn-tasks-entity-source/specs/cn-tasks-entity-source/spec.md
		 */
		async load(config = {}) {
			const params = { scope: 'assigned', sort: '-dueAt' }
			for (const key of ALLOWED_PARAMS) {
				const value = config ? config[key] : undefined
				if (value === undefined || value === null || value === '') {
					continue
				}
				// The endpoint reads `overdue` as a boolean-ish string; a quick
				// filter authors it as `true` for legibility.
				params[key] = (key === 'overdue' || key === 'isTerminal') ? String(value) : value
			}

			this.loading = true
			this.error = null
			try {
				const response = await axios.get(generateUrl(FLOW_TASKS_URL), { params })
				this.tasks = response.data?.results || []
				this.total = Number(response.data?.total ?? this.tasks.length) || 0
			} catch (error) {
				// Surfaced, not swallowed: an empty inbox with no trace of why is
				// indistinguishable from a healthy quiet one.
				this.error = error?.message || String(error)
				this.tasks = []
				this.total = 0
				// eslint-disable-next-line no-console
				console.error('[useTaskInboxStore] Loading the task inbox failed', error)
			} finally {
				this.loading = false
			}
		},
	},
})
