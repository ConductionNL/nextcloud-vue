/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { defineStore } from 'pinia'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

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
const ALLOWED_PARAMS = ['scope', 'state', 'priority', 'overdue', 'objectUuid', 'sort', 'limit', 'offset']

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
		 * Load one inbox page.
		 *
		 * Defaults are the inbox's resting shape: the viewer's ASSIGNED tasks,
		 * most urgent due date first (`-dueAt`). Every key is optional and
		 * only allowlisted keys are forwarded; filtering, sorting and paging
		 * are the server's, never applied over a returned page.
		 *
		 * @param {object} [config] Loader config from the page (`sourceConfig`
		 *   merged with the active quick-filter tab): `scope`, `state`,
		 *   `priority`, `overdue`, `objectUuid`, `sort`, `limit`, `offset`.
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
				params[key] = (key === 'overdue') ? String(value) : value
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
				console.error('[useTaskInboxStore] Loading the task inbox failed', error)
			} finally {
				this.loading = false
			}
		},
	},
})
