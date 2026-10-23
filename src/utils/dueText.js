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
import { ageInDays, boardDateLocale, formatBoardDate, formatRelativeDate } from './boardDate.js'
import { parseDateValue } from './dateVariant.js'
import { indicatorApplies } from './rowIndicators.js'

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
 * `empty`, `plain`. With `soonWithin` (days), today and a date at most that many days
 * ahead also carry `soon: true`, drawn in the warning colour. With
 * `activeWhen` (`{ field, equals | in | lt | gt }`, the row-indicator grammar)
 * the date is only due while that holds on the row: otherwise it reads as the
 * short date in the `plain` tone, never overdue or soon (a won lead's close
 * date is history, not a deadline); with `inactiveLabel` ("Done on {date}") it
 * reads that text in the `muted` tone instead. `todayTone: "danger"` draws
 * today as overdue. With `nearWithin` (days), tomorrow reads "Tomorrow" (or
 * `tomorrowLabel`) and a later day within that many days its weekday and date
 * ("Friday 9 Oct").
 *
 * @param {unknown} value A Date, a timestamp or an ISO string.
 * @param {object} [config] The `due` config.
 * @param {(text: string) => string} [translate] The host's translate.
 * @param {Date} [now] The reference moment.
 * @param {object} [row] The row the date belongs to, for `activeWhen`.
 * @return {{text: string, tone: string}|null} The text and tone, or null when there is nothing to show.
 * @spec openspec/changes/pl4-cell-rules/specs/pl4-cell-rules/spec.md#requirement-a-due-date-is-due-only-while-a-row-condition-holds
 * @spec openspec/changes/due-text-today-near-done/specs/due-text/spec.md
 */
export function resolveDue(value, config, translate = (text) => text, now = new Date(), row = null) {
	const cfg = config && typeof config === 'object' ? config : {}
	const date = parseDateValue(value)
	if (date === null) {
		const empty = typeof cfg.emptyText === 'string' && cfg.emptyText !== '' ? translate(cfg.emptyText) : ''
		return empty === '' ? null : { text: empty, tone: 'empty' }
	}
	if (cfg.activeWhen && typeof cfg.activeWhen === 'object' && !indicatorApplies(cfg.activeWhen, row || {}, now)) {
		if (typeof cfg.inactiveLabel === 'string' && cfg.inactiveLabel !== '') {
			return { text: translate(cfg.inactiveLabel).replace(/\{date\}/g, formatBoardDate(date, now)), tone: 'muted' }
		}
		return { text: formatBoardDate(date, now), tone: 'plain' }
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
		return withSoon({ text: label, tone: cfg.todayTone === 'danger' ? 'danger' : 'today' }, 0, cfg)
	}
	return withSoon({ text: upcomingText(-days, cfg, translate) ?? nearText(date, -days, cfg, translate, now) ?? formatRelativeDate(date, { now }), tone: 'upcoming' }, -days, cfg)
}

/**
 * A day to come within `nearWithin` days by name: "Tomorrow" (or
 * `tomorrowLabel`), else its weekday and date ("Friday 9 Oct"). Null
 * without `nearWithin` or past it.
 *
 * @param {Date} date The due date.
 * @param {number} left Whole days left, at least 1.
 * @param {object} cfg The `due` config.
 * @param {(text: string) => string} translate The host's translate.
 * @param {Date} now The reference moment.
 * @return {string|null} The text, or null.
 * @spec openspec/changes/due-text-today-near-done/specs/due-text/spec.md
 */
function nearText(date, left, cfg, translate, now) {
	const within = Number(cfg.nearWithin)
	if (!Number.isFinite(within) || left > within) {
		return null
	}
	if (left === 1) {
		return typeof cfg.tomorrowLabel === 'string' && cfg.tomorrowLabel !== ''
			? translate(cfg.tomorrowLabel)
			: capitalise(formatRelativeDate(date, { now }))
	}
	const parts = { weekday: 'long', day: 'numeric', month: 'short' }
	let text
	try {
		text = new Intl.DateTimeFormat(boardDateLocale(), parts).format(date)
	} catch {
		text = new Intl.DateTimeFormat(undefined, parts).format(date)
	}
	return capitalise(text.replace(/,/g, ''))
}

/**
 * The text with its first letter in upper case.
 *
 * @param {string} text The text.
 * @return {string} The text, capitalised.
 */
function capitalise(text) {
	return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}

/**
 * Marks a due date within `soonWithin` days as soon.
 *
 * @param {{text: string, tone: string}} result The due text and tone.
 * @param {number} left Whole days left, 0 for today.
 * @param {object} cfg The `due` config.
 * @return {{text: string, tone: string, soon?: boolean}} The result, with `soon: true` when it is due soon.
 * @spec openspec/changes/due-text-soon/specs/due-text-soon/spec.md#requirement-a-due-date-within-a-few-days-reads-as-soon
 */
function withSoon(result, left, cfg) {
	const within = Number(cfg.soonWithin)
	return Number.isFinite(within) && within >= 0 && left <= within ? { ...result, soon: true } : result
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
