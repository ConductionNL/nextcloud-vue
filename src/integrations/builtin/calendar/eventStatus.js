/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A calendar event's status as a label and a badge tone, shared by the
 * calendar tab and the calendar card.
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * The event's status in words, or '' when it has none the reader needs.
 *
 * @param {object} ev The event.
 * @return {string}
 */
export function eventStatusLabel(ev) {
	const status = String(ev?.status || '').toLowerCase()
	if (status === 'confirmed') {
		return t('nextcloud-vue', 'Confirmed')
	}
	if (status === 'tentative') {
		return t('nextcloud-vue', 'Tentative')
	}
	if (status === 'cancelled') {
		return t('nextcloud-vue', 'Cancelled')
	}
	return ''
}

/**
 * The badge tone of the event's status.
 *
 * @param {object} ev The event.
 * @return {string} `success`, `warning`, `error` or `default`.
 */
export function eventStatusVariant(ev) {
	const status = String(ev?.status || '').toLowerCase()
	if (status === 'confirmed') {
		return 'success'
	}
	if (status === 'tentative') {
		return 'warning'
	}
	if (status === 'cancelled') {
		return 'error'
	}
	return 'default'
}

/**
 * The names of the event's attendees.
 *
 * @param {object} ev The event.
 * @return {Array<string>}
 */
export function eventAttendeeNames(ev) {
	const raw = ev?.attendees || ev?.participants || []
	if (!Array.isArray(raw)) {
		return []
	}
	return raw.map((att) => (typeof att === 'string' ? att : (att.name || att.displayName || att.cn || att.email || ''))).filter(Boolean)
}
