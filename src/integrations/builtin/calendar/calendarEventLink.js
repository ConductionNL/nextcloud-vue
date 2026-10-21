/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Link an existing calendar event to a record: the one call the calendar
 * tab, the calendar card and the events card make (OpenRegister writes only
 * a link row, because the event may not be ours to change).
 */

import { translate as t } from '@nextcloud/l10n'
import { buildHeaders } from '../../../utils/index.js'

/**
 * POST the picked event to the record's link endpoint.
 *
 * @param {string} eventsUrl The record's events address, prefixed (`…/objects/{r}/{s}/{id}/events`, `…/flow-tasks/{id}/events`).
 * @param {{calendarUri: string, eventUid: string}} payload The picked event.
 * @return {Promise<{ok: boolean, error: string}>} Whether it was linked, else the sentence to show.
 */
export async function linkCalendarEvent(eventsUrl, payload) {
	const failed = t('nextcloud-vue', 'Could not link the meeting.')
	try {
		const response = await fetch(`${eventsUrl}/link`, {
			method: 'POST',
			headers: buildHeaders(),
			body: JSON.stringify(payload),
		})
		if (response.ok) {
			return { ok: true, error: '' }
		}
		let message = failed
		try {
			const body = await response.json()
			if (body && typeof body.error === 'string') {
				message = body.error
			}
		} catch { /* the refusal had no body */ }
		return { ok: false, error: message }
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[calendar] failed to link event', err)
		return { ok: false, error: failed }
	}
}
