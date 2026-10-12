/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * dueText: the text of a due date and the tone it is drawn in.
 *
 * "3 dagen te laat" in the danger colour, "Vandaag", the short date for a
 * day still to come ("morgen", "20 okt"), and a configured text when the
 * field is empty ("Geen deadline"). One formatter for record-list rows and
 * table cells, built on the relative date (`formatRelativeDate`).
 *
 * @module utils/dueText
 * @spec openspec/changes/screens-due-text/specs/due-text/spec.md#requirement-a-due-date-reads-as-text-with-a-tone
 */

import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { ageInDays, formatRelativeDate } from './boardDate.js'
import { parseDateValue } from './dateVariant.js'

/**
 * The text and tone of a due date.
 *
 * Config (all optional): `todayLabel` (default "Due today"), `overdueLabel`
 * `{ one, other }` with `{count}` (default "{count} day overdue" / "{count} days
 * overdue"), `emptyText` (shown when the field is empty; without it an empty
 * field reads as nothing). Texts go through `translate` before `{count}` is
 * filled. Tones: `danger` (overdue), `today`, `upcoming`, `empty`.
 *
 * @param {unknown} value A Date, a timestamp or an ISO string.
 * @param {object} [config] The `due` config.
 * @param {(text: string) => string} [translate] The host's translate.
 * @param {Date} [now] The reference moment.
 * @return {{text: string, tone: string}|null} The text and tone, or null when there is nothing to show.
 */
export function resolveDue(value, config, translate = (text) => text, now = new Date()) {
	const cfg = config && typeof config === 'object' ? config : {}
	const date = parseDateValue(value)
	if (date === null) {
		const empty = typeof cfg.emptyText === 'string' && cfg.emptyText !== '' ? translate(cfg.emptyText) : ''
		return empty === '' ? null : { text: empty, tone: 'empty' }
	}
	const days = ageInDays(date, now)
	if (days > 0) {
		const labels = cfg.overdueLabel && typeof cfg.overdueLabel === 'object' ? cfg.overdueLabel : null
		if (labels && (labels.one || labels.other)) {
			const template = translate((days === 1 ? labels.one : labels.other) || labels.other || labels.one)
			return { text: template.replace(/\{count\}/g, String(days)), tone: 'danger' }
		}
		return { text: n('nextcloud-vue', '{count} day overdue', '{count} days overdue', days, { count: days }), tone: 'danger' }
	}
	if (days === 0) {
		const label = typeof cfg.todayLabel === 'string' && cfg.todayLabel !== '' ? translate(cfg.todayLabel) : t('nextcloud-vue', 'Due today')
		return { text: label, tone: 'today' }
	}
	return { text: formatRelativeDate(date, { now }), tone: 'upcoming' }
}
