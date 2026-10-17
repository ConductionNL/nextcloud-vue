/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * dueText: the text of a due date and the tone it is drawn in.
 *
 * "3 dagen te laat" in the danger colour, "Vandaag", the short date for a
 * day still to come ("morgen", "20 okt"), and a configured text when the
 * field is empty ("Geen deadline"). A day to come can read as a count instead
 * ("nog 4 dagen", "nog 8 weken"). One formatter for record-list rows and
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
 * field reads as nothing), `upcomingLabel` `{ one, other }` with `{count}`
 * (a day to come reads as the days left instead of the date), and
 * `upcomingWeeksLabel` `{ one, other }` (from `upcomingWeeksFrom` days left,
 * default 35, it reads the weeks left, rounded). Texts go through `translate`
 * before `{count}` is filled. Tones: `danger` (overdue), `today`, `upcoming`,
 * `empty`.
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
		const overdue = pluralLabel(cfg.overdueLabel, days, translate)
		if (overdue !== null) {
			return { text: overdue, tone: 'danger' }
		}
		return { text: n('nextcloud-vue', '{count} day overdue', '{count} days overdue', days, { count: days }), tone: 'danger' }
	}
	if (days === 0) {
		const label = typeof cfg.todayLabel === 'string' && cfg.todayLabel !== '' ? translate(cfg.todayLabel) : t('nextcloud-vue', 'Due today')
		return { text: label, tone: 'today' }
	}
	return { text: upcomingText(-days, cfg, translate) ?? formatRelativeDate(date, { now }), tone: 'upcoming' }
}

/**
 * The days or weeks left before a date to come, or null without `upcomingLabel`.
 *
 * @param {number} left Whole days left, at least 1.
 * @param {object} cfg The `due` config.
 * @param {(text: string) => string} translate The host's translate.
 * @return {string|null} The text, or null.
 * @spec openspec/changes/due-text-upcoming-count/specs/due-text-upcoming-count/spec.md#requirement-a-due-date-to-come-can-read-as-the-time-left
 */
function upcomingText(left, cfg, translate) {
	const from = Number(cfg.upcomingWeeksFrom)
	const weeksFrom = Number.isFinite(from) && from > 0 ? from : 35
	if (left >= weeksFrom) {
		const weeks = pluralLabel(cfg.upcomingWeeksLabel, Math.round(left / 7), translate)
		if (weeks !== null) {
			return weeks
		}
	}
	return pluralLabel(cfg.upcomingLabel, left, translate)
}

/**
 * A `{ one, other }` label with `{count}` filled, or null when none is configured.
 *
 * @param {unknown} labels The configured label pair.
 * @param {number} count The count.
 * @param {(text: string) => string} translate The host's translate.
 * @return {string|null} The text, or null.
 */
function pluralLabel(labels, count, translate) {
	if (!labels || typeof labels !== 'object' || !(labels.one || labels.other)) {
		return null
	}
	const template = translate((count === 1 ? labels.one : labels.other) || labels.other || labels.one)
	return template.replace(/\{count\}/g, String(count))
}
