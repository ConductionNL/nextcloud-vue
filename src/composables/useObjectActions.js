/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useObjectActions: the actions OpenRegister lists for one object
 * (object-actions-declared-and-run, D-5) and running one.
 *
 * - `GET /api/objects/{register}/{schema}/{id}/actions` answers
 *   `{ actions: [{ key, kind, label, description, icon, surfaces, available,
 *   reason?, inputs, confirm?, mode, next }] }`; actions the reader may not run
 *   are left out, and one whose `when` fails is listed with `available: false`.
 * - `POST /api/objects/{register}/{schema}/{id}/actions/{action}` with
 *   `{ inputs }` runs it: 200 when finished, 202 when it was queued or suspended.
 *
 * @module composables/useObjectActions
 * @spec openspec/changes/object-actions/specs/object-actions/spec.md
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { ref } from 'vue'

const BASE = '/apps/openregister/api/objects'

/**
 * The URL of an object's actions.
 *
 * @param {{register: string, schema: string, id: string}} address The object.
 * @param {string} [action] An action key, for its run URL.
 * @return {string}
 */
export function objectActionsUrl({ register, schema, id }, action = '') {
	const path = `${BASE}/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(id)}/actions`
	return generateUrl(action ? `${path}/${encodeURIComponent(action)}` : path)
}

/**
 * A label as a reader sees it: a string, or a locale map read in the reader's
 * language, then English, then the first entry.
 *
 * @param {string|object} label The label.
 * @param {string} [language] The language.
 * @return {string}
 */
export function actionLabelText(label, language = '') {
	if (typeof label === 'string') {
		return label
	}
	if (!label || typeof label !== 'object') {
		return ''
	}
	const base = String(language).split(/[-_]/)[0]
	return label[language] || label[base] || label.en || Object.values(label).find((v) => typeof v === 'string') || ''
}

/**
 * The listed actions of one object.
 *
 * @param {{register: string, schema: string, id: string}} address The object.
 * @return {Promise<Array<object>>} The actions; [] when the list cannot be read.
 * @spec openspec/changes/object-actions/specs/object-actions/spec.md#requirement-a-page-offers-the-actions-openregister-lists-for-an-object
 */
export async function fetchObjectActions(address) {
	if (!address || !address.register || !address.schema || !address.id) {
		return []
	}
	try {
		const { data } = await axios.get(objectActionsUrl(address))
		const list = Array.isArray(data) ? data : (data && Array.isArray(data.actions) ? data.actions : [])
		return list.filter((action) => action && typeof action.key === 'string' && action.key !== '')
	} catch {
		return []
	}
}

/**
 * Run one action.
 *
 * @param {{register: string, schema: string, id: string}} address The object.
 * @param {string} action The action key.
 * @param {object} [inputs] The inputs.
 * @return {Promise<{ok: boolean, queued: boolean, data?: object, message?: string}>} `queued` for a 202.
 * @spec openspec/changes/object-actions/specs/object-actions/spec.md#requirement-a-page-offers-the-actions-openregister-lists-for-an-object
 */
export async function runObjectAction(address, action, inputs = {}) {
	try {
		const response = await axios.post(objectActionsUrl(address, action), { inputs: inputs || {} })
		return { ok: true, queued: response.status === 202, data: response.data }
	} catch (error) {
		const body = error && error.response && error.response.data
		return { ok: false, queued: false, message: (body && (body.message || body.error || body.reason)) || '' }
	}
}

/**
 * The actions of one object, reactive.
 *
 * @param {() => ({register: string, schema: string, id: string}|null)} address A getter for the object.
 * @return {{actions: import('vue').Ref<Array<object>>, load: Function, run: Function}}
 */
export function useObjectActions(address) {
	const actions = ref([])
	const read = () => (typeof address === 'function' ? address() : address)
	const load = async () => {
		actions.value = await fetchObjectActions(read())
		return actions.value
	}
	const run = (key, inputs) => runObjectAction(read(), key, inputs)
	return { actions, load, run }
}
