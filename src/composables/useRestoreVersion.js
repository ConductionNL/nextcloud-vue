/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useRestoreVersion — restore a record to the state after one audit-trail
 * entry, through OpenRegister's revert route. OpenRegister saves the restore
 * as a new version, so nothing is lost.
 *
 * @spec openspec/changes/audit-trail-restore-version/tasks.md#task-1
 */
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { buildHeaders } from '../utils/index.js'
import { lockHolder } from '../utils/objectLock.js'

/**
 * Restore a record to the state after an audit-trail entry.
 *
 * The returned `message` is always one of the library's fixed sentences, never
 * the server's own text.
 *
 * @param {object} [options] Options.
 * @param {string} [options.apiBase] Base URL of the OpenRegister API.
 * @return {{ restore: (target: {register: string, schema: string, objectId: string, auditTrailId: string|number, object?: object}) => Promise<{ok: boolean, status: number, record: object|null, message: string}> }} The restore function.
 */
export function useRestoreVersion({ apiBase = '/apps/openregister/api' } = {}) {
	/**
	 * Post the revert request and map the outcome to a fixed sentence.
	 *
	 * @param {object} target The record and the entry to restore to.
	 * @param {string} target.register The register slug.
	 * @param {string} target.schema The schema slug.
	 * @param {string} target.objectId The record id.
	 * @param {string|number} target.auditTrailId The audit-trail entry id.
	 * @param {object} [target.object] The record as the page holds it, read for the lock holder on a 423.
	 * @return {Promise<{ok: boolean, status: number, record: object|null, message: string}>} The outcome.
	 */
	async function restore({ register, schema, objectId, auditTrailId, object = null }) {
		const url = generateUrl(`${apiBase}/objects/${register}/${schema}/${objectId}/revert`)
		let response
		try {
			response = await fetch(url, {
				method: 'POST',
				headers: buildHeaders(),
				body: JSON.stringify({ auditTrailId }),
			})
		} catch {
			return { ok: false, status: 0, record: null, message: t('nextcloud-vue', 'The record could not be restored.') }
		}

		let body
		try {
			body = await response.json()
		} catch {
			body = null
		}

		if (response.ok) {
			return { ok: true, status: response.status, record: body, message: '' }
		}

		let message = t('nextcloud-vue', 'The record could not be restored.')
		if (response.status === 403) {
			message = t('nextcloud-vue', 'You cannot restore this record.')
		} else if (response.status === 423) {
			const holder = lockHolder(body) ?? lockHolder(object)
			message = holder
				? t('nextcloud-vue', 'This record is locked by {name}.', { name: holder })
				: t('nextcloud-vue', 'This record is locked by someone else.')
		} else if (response.status === 404) {
			message = t('nextcloud-vue', 'This record no longer exists.')
		}
		return { ok: false, status: response.status, record: null, message }
	}

	return { restore }
}
