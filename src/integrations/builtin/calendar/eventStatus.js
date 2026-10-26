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
	const answer = inviteeAnswer(ev)
	if (answer === 'needs-action') {
		return t('nextcloud-vue', 'Invited')
	}
	if (answer === 'accepted') {
		return t('nextcloud-vue', 'Accepted')
	}
	if (answer === 'declined') {
		return t('nextcloud-vue', 'Declined')
	}
	if (answer === 'tentative') {
		return t('nextcloud-vue', 'Tentative')
	}
	return ''
}

/**
 * Where the invitees stand when the event itself has no status: a decline
 * first, then anyone still to answer, then a tentative answer, else accepted
 * when all accepted; '' without invitees that answered or were asked.
 *
 * @param {object} ev The event.
 * @return {string} `declined`, `needs-action`, `tentative`, `accepted` or ''.
 * @spec openspec/changes/calendar-invitee-answer/specs/calendar-integration/spec.md#requirement-an-appointment-without-a-status-shows-where-its-invitees-stand
 */
export function inviteeAnswer(ev) {
	const answers = (Array.isArray(ev?.attendees) ? ev.attendees : [])
		.map((att) => (att && typeof att === 'object' ? String(att.partstat || '').toLowerCase() : ''))
		.filter(Boolean)
	for (const answer of ['declined', 'needs-action', 'tentative']) {
		if (answers.includes(answer)) {
			return answer
		}
	}
	return answers.length > 0 && answers.every((answer) => answer === 'accepted') ? 'accepted' : ''
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
	const answer = inviteeAnswer(ev)
	if (answer === 'accepted') {
		return 'success'
	}
	if (answer === 'declined') {
		return 'error'
	}
	return answer === '' ? 'default' : 'info'
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
