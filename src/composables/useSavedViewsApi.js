// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * useSavedViewsApi — thin REST wrapper around OpenRegister's saved-search
 * Views API (ViewsController):
 *
 * - `GET    /apps/openregister/api/views`      → `{ results: View[], total }`
 * - `POST   /apps/openregister/api/views`      → 201 `{ view: View }`
 * - `PUT    /apps/openregister/api/views/{id}` → `{ view: View }`
 * - `DELETE /apps/openregister/api/views/{id}` → 204
 *
 * The list endpoint is session-scoped server-side (own views + public
 * views); mutations are owner-scoped (a foreign id 404s). Payload shape
 * for create/update comes from `buildViewCreatePayload` in
 * `utils/savedViewHelpers.js` — the `query` field round-trips opaquely.
 *
 * Business logic (state serialization, ownership gating, user feedback)
 * lives in the caller; network errors propagate to the caller's try/catch.
 *
 * @return {{ fetchViews: Function, createView: Function, updateView: Function, deleteView: Function }} The API surface.
 */
export function useSavedViewsApi() {
	const base = '/apps/openregister/api/views'

	/**
	 * Fetch all views visible to the current user (own + public).
	 *
	 * @return {Promise<Array<object>>} The view list (empty array on shape mismatch).
	 */
	async function fetchViews() {
		const response = await axios.get(generateUrl(base))
		const results = response?.data?.results
		return Array.isArray(results) ? results : []
	}

	/**
	 * Create a view.
	 *
	 * @param {object} payload The request body (see `buildViewCreatePayload`).
	 * @return {Promise<object>} The created View object.
	 */
	async function createView(payload) {
		const response = await axios.post(generateUrl(base), payload)
		return response?.data?.view
	}

	/**
	 * Full-update a view (name required by the API).
	 *
	 * @param {string|number} id The view id (numeric id or uuid).
	 * @param {object} payload The request body (see `buildViewCreatePayload`).
	 * @return {Promise<object>} The updated View object.
	 */
	async function updateView(id, payload) {
		const response = await axios.put(generateUrl(`${base}/${encodeURIComponent(id)}`), payload)
		return response?.data?.view
	}

	/**
	 * Delete a view (owner-scoped server-side).
	 *
	 * @param {string|number} id The view id (numeric id or uuid).
	 * @return {Promise<void>} Resolves on 204.
	 */
	async function deleteView(id) {
		await axios.delete(generateUrl(`${base}/${encodeURIComponent(id)}`))
	}

	return { fetchViews, createView, updateView, deleteView }
}
