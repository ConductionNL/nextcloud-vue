/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * samplePayload — the payload a list widget draws as a miniature in a widget
 * picker (`preview`), built from its sample rows instead of a server read.
 */

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

/**
 * Build `{ results, total }` from a widget's sample rows. Times in a sample
 * are relative, so a miniature never shows a run that started last year:
 * `ageMinutes` becomes `created` that many minutes ago, `dueInDays` becomes
 * `dueAt` that many days from now (with `daysUntilDue`, `daysOverdue` and
 * `overdue` as the inbox read answers them).
 *
 * @param {Array<object>|undefined} rows The sample rows (e.g. `content.sampleRows`).
 * @param {number} [now] The current time in ms, for tests.
 * @return {{results: Array<object>, total: number}} The payload.
 */
export function samplePayload(rows, now = Date.now()) {
	const list = Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : []
	const results = list.map((row) => {
		const { ageMinutes, dueInDays, ...rest } = row
		const out = { ...rest }
		if (typeof ageMinutes === 'number' && out.created === undefined) {
			out.created = new Date(now - ageMinutes * MINUTE).toISOString()
		}
		if (typeof dueInDays === 'number' && out.dueAt === undefined) {
			out.dueAt = new Date(now + dueInDays * DAY).toISOString()
			out.overdue = dueInDays < 0
			out.daysUntilDue = dueInDays >= 0 ? dueInDays : null
			out.daysOverdue = dueInDays < 0 ? -dueInDays : null
		}
		return out
	})
	return { results, total: results.length }
}
