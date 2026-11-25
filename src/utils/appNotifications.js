/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * One app's notifications out of the Nextcloud notifications OCS answer
 * (CnNotificationsBadge).
 *
 * @module utils/appNotifications
 */

import { formatRelativeTime } from './builtInFormatters.js'

/**
 * The entries of a notifications OCS answer that belong to one app, newest
 * first, with what the badge draws.
 *
 * @spec openspec/changes/dashboard-notifications-badge/specs/dashboard-page/spec.md#requirement-a-dashboard-header-counts-the-users-unread-notifications-of-the-app
 * @param {object} answer The axios response body (`{ ocs: { data: [] } }`).
 * @param {string} appId The app whose notifications count.
 * @return {Array<{id: number, subject: string, link: string, icon: string, datetime: string, when: string}>}
 */
export function appNotifications(answer, appId) {
	const list = Array.isArray(answer?.ocs?.data) ? answer.ocs.data : []
	return list
		.filter((entry) => entry && entry.app === appId && entry.notification_id !== undefined)
		.map((entry) => ({
			id: entry.notification_id,
			subject: entry.subject || entry.message || '',
			link: entry.link || '',
			icon: entry.icon || '',
			datetime: entry.datetime || '',
			when: entry.datetime ? formatRelativeTime(entry.datetime) : '',
		}))
		.sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)))
}
