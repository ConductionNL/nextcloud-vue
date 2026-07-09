/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Generic daily-planning fetch contract for the offline data-collection core.
 *
 * Replaces procest's bespoke `GET /apps/procest/api/sync/daily` endpoint with a
 * configurable query against the STANDARD OpenRegister object API:
 *
 *     GET /apps/openregister/api/objects/{register}/{schema}?<planning filter>
 *
 * The consuming app declares which property holds the assignee and which holds
 * the scheduled date; this module turns "today's planning for me" into the
 * matching object-API query params. OR's `buildSearchQuery` consumes arbitrary
 * property filters, and OR's RBAC + multitenancy already scope the result to the
 * caller — so no per-app `/sync/daily` endpoint is needed.
 *
 * @module integrations/offline/planningFetch
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * Format a Date as a `Y-m-d` day string (local time).
 *
 * @param {Date} date The date.
 *
 * @return {string} The `YYYY-MM-DD` string.
 */
export function toDayString(date) {
	const d = date instanceof Date ? date : new Date()
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}

/**
 * Build the object-API query params that select "today's planned items".
 *
 * The returned params are passed verbatim to the OR objects index endpoint.
 * Only the configured filter keys are emitted, so an app that plans by
 * `assignee` + `scheduledAt` and an app that plans by `inspectorRef` +
 * `plannedFor` both work without code changes — purely config-driven.
 *
 * @param {object}  config              Planning config.
 * @param {?string} config.assigneeField Property holding the assignee (filter ==).
 * @param {?string} config.assignee      Assignee value (e.g. current user uid).
 * @param {?string} config.dateField     Property holding the scheduled date.
 * @param {?string} [config.date]        Target day (default: today). When the
 *   stored value is a full timestamp the caller should index on the `Y-m-d`
 *   prefix; OR's filter matches the configured field exactly, so apps that
 *   store a date-only field filter precisely, and apps that store a timestamp
 *   should expose a date-only projection field.
 * @param {object}  [config.extraFilters] Extra exact-match property filters.
 * @param {number}  [config.limit]       Max items (default 200).
 *
 * @return {object} The query params object.
 */
export function buildPlanningQuery(config) {
	const params = {}
	if (config.assigneeField && config.assignee) {
		params[config.assigneeField] = config.assignee
	}
	if (config.dateField) {
		params[config.dateField] = config.date || toDayString(new Date())
	}
	if (config.extraFilters && typeof config.extraFilters === 'object') {
		for (const [key, value] of Object.entries(config.extraFilters)) {
			params[key] = value
		}
	}
	params._limit = config.limit || 200
	return params
}

/**
 * Fetch today's planned items for a register/schema via the OR object API.
 *
 * @param {object} config              Planning config (see buildPlanningQuery).
 * @param {string} config.register     Register slug or id.
 * @param {string} config.schema       Schema slug or id.
 *
 * @return {Promise<Array>} The planned objects (`results`/`items`/array body).
 */
export async function fetchPlanning(config) {
	const url = generateUrl(`/apps/openregister/api/objects/${config.register}/${config.schema}`)
	const { data } = await axios.get(url, { params: buildPlanningQuery(config) })
	return data?.results || data?.items || (Array.isArray(data) ? data : []) || []
}

/**
 * Fetch the reference objects (e.g. checklist templates) a planning needs.
 *
 * Generic helper for the second collection a planning download caches — the
 * templates/definitions the planned items reference. Apps that have no
 * references skip this.
 *
 * @param {object} config              Reference config.
 * @param {string} config.register     Register slug or id.
 * @param {string} config.referenceSchema Schema slug of the references.
 * @param {object} [config.filters]    Optional exact-match filters.
 * @param {number} [config.limit]      Max items (default 200).
 *
 * @return {Promise<Array>} The reference objects.
 */
export async function fetchReferences(config) {
	if (!config.referenceSchema) {
		return []
	}
	const url = generateUrl(`/apps/openregister/api/objects/${config.register}/${config.referenceSchema}`)
	const params = { ...(config.filters || {}), _limit: config.limit || 200 }
	const { data } = await axios.get(url, { params })
	return data?.results || data?.items || (Array.isArray(data) ? data : []) || []
}
