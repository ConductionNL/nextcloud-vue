/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { defineStore } from 'pinia'

/**
 * OpenRegister's organisation endpoints, behind the `organisations` entity source.
 *
 * An organisation is not a register/schema object, so the object store cannot
 * read it. Both reads answer from the session: the list holds only the
 * organisations the viewer belongs to, and one organisation answers 403 when
 * the viewer has no access to it. This store adds no check of its own and
 * skips none.
 *
 * @type {string}
 */
export const ORGANISATIONS_URL = '/apps/openregister/api/organisations'

/**
 * One organisation as a row or a record: the organisation as OpenRegister
 * serialises it, with `id` set to its uuid. An OpenRegister object's `id` is
 * its uuid as well, so `@object.id`, a row route and the page's `objectId`
 * all name the same thing. The numeric database id stays out of sight.
 *
 * @param {object} organisation The organisation from the endpoint.
 * @return {object} The organisation keyed on its uuid.
 */
export function organisationRecord(organisation) {
	return { ...organisation, id: organisation?.uuid ?? organisation?.id ?? null }
}

/**
 * The organisations store.
 *
 * @spec openspec/changes/organisations-entity-source/specs/organisations-entity-source/spec.md
 */
export const useOrganisationStore = defineStore('cnOrganisations', {
	state: () => ({
		/** @type {Array<object>} The viewer's organisations, as the list endpoint returned them. */
		organisations: [],
		/** @type {boolean} Whether the list load is in flight. */
		loading: false,
		/** @type {string|null} The last list failure, for the console trail. */
		error: null,
		/** @type {Record<string, object>} Single organisations read so far, by uuid. */
		records: {},
		/** @type {Record<string, number|null>} The HTTP status of a failed single read, by uuid. */
		recordErrors: {},
	}),

	actions: {
		/**
		 * Load the viewer's organisations. The endpoint takes no parameters and
		 * returns every organisation the viewer belongs to in one response.
		 *
		 * @return {Promise<void>} Resolves when the rows are in the store.
		 */
		async load() {
			this.loading = true
			this.error = null
			try {
				const response = await axios.get(generateUrl(ORGANISATIONS_URL))
				this.organisations = Array.isArray(response.data?.results) ? response.data.results : []
			} catch (error) {
				this.error = error?.message || String(error)
				this.organisations = []
				// eslint-disable-next-line no-console
				console.error('[useOrganisationStore] Loading the organisations failed', error)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Read one organisation into `records`. A refusal (403) or a missing
		 * organisation (404) leaves no record and keeps the status in
		 * `recordErrors`, so the page can tell "not found" from "still loading".
		 *
		 * @param {string} uuid The organisation uuid.
		 * @return {Promise<object|null>} The organisation, or null when it could not be read.
		 */
		async fetchRecord(uuid) {
			const key = String(uuid || '')
			if (key === '') {
				return null
			}
			try {
				const response = await axios.get(generateUrl(`${ORGANISATIONS_URL}/${encodeURIComponent(key)}`))
				const organisation = response.data?.organisation || null
				const { [key]: dropped, ...errors } = this.recordErrors
				this.recordErrors = errors
				if (!organisation) {
					return null
				}
				this.records = { ...this.records, [key]: organisation }
				return organisation
			} catch (error) {
				const { [key]: dropped, ...records } = this.records
				this.records = records
				this.recordErrors = { ...this.recordErrors, [key]: error?.response?.status ?? null }
				// eslint-disable-next-line no-console
				console.error(`[useOrganisationStore] Loading organisation "${key}" failed`, error)
				return null
			}
		},
	},
})
