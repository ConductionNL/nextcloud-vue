// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// Five-field cron: parse, validate, and say in words.
//
// Standard cron only — `minute hour day-of-month month day-of-week`, with `*`,
// numbers, `a-b` ranges, `a,b` lists and `*/n` steps. `@daily` and its siblings
// are deliberately NOT accepted: which scheduler resolves them varies, and a
// schedule that validates and never fires is worse than one that is refused at
// the point someone can still fix it.

import { translate as t } from '@nextcloud/l10n'

/**
 * The allowed numeric range of each field, in cron's own order.
 *
 * Day-of-week runs 0-7 because BOTH 0 and 7 mean Sunday in standard cron.
 * Rejecting 7 would refuse expressions that every crontab accepts.
 */
const RANGES = [
	{ name: 'minute', min: 0, max: 59 },
	{ name: 'hour', min: 0, max: 23 },
	{ name: 'monthday', min: 1, max: 31 },
	{ name: 'month', min: 1, max: 12 },
	{ name: 'weekday', min: 0, max: 7 },
]

const WEEKDAY_NAMES = () => ([
	t('nextcloud-vue', 'Sunday'),
	t('nextcloud-vue', 'Monday'),
	t('nextcloud-vue', 'Tuesday'),
	t('nextcloud-vue', 'Wednesday'),
	t('nextcloud-vue', 'Thursday'),
	t('nextcloud-vue', 'Friday'),
	t('nextcloud-vue', 'Saturday'),
])

/**
 * Split an expression into named fields.
 *
 * Always returns all five names so callers never have to guard each one; a
 * missing or malformed field reads as `*`, which is what cron means by "no
 * restriction" and is the safe thing for a half-typed expression.
 *
 * @param {string} expression The cron expression.
 * @return {{minute: string, hour: string, monthday: string, month: string, weekday: string}} The fields.
 */
export function parseCron(expression) {
	const fields = String(expression || '').trim().split(/\s+/)

	return {
		minute: fields[0] || '*',
		hour: fields[1] || '*',
		monthday: fields[2] || '*',
		month: fields[3] || '*',
		weekday: fields[4] || '*',
	}
}

/**
 * Whether one field is a legal cron term for its position.
 *
 * @param {string} field The field.
 * @param {{min: number, max: number}} range Its allowed range.
 * @return {boolean} Whether it is legal.
 */
function isValidField(field, range) {
	if (field === '*') {
		return true
	}

	// Every term of a comma list has to stand on its own, so this recurses
	// rather than matching one big pattern: `1,,2` and `1,99` are both refused
	// for the same reason a bare `99` is.
	return String(field).split(',').every((term) => {
		if (term === '') {
			return false
		}

		const [body, step] = term.split('/')
		if (term.split('/').length > 2) {
			return false
		}

		if (step !== undefined && /^\d+$/.test(step) === false) {
			return false
		}
		if (step !== undefined && Number(step) < 1) {
			return false
		}

		if (body === '*') {
			return true
		}

		const bounds = body.split('-')
		if (bounds.length > 2) {
			return false
		}

		const numbers = bounds.map((n) => (/^\d+$/.test(n) ? Number(n) : null))
		if (numbers.some((n) => n === null)) {
			return false
		}
		if (numbers.some((n) => n < range.min || n > range.max)) {
			return false
		}
		if (numbers.length === 2 && numbers[0] > numbers[1]) {
			return false
		}

		return true
	})
}

/**
 * Whether an expression is a legal five-field cron.
 *
 * @param {string} expression The cron expression.
 * @return {boolean} Whether it is legal.
 */
export function isValidCron(expression) {
	const fields = String(expression || '').trim().split(/\s+/)
	if (fields.length !== 5) {
		return false
	}

	return fields.every((field, index) => isValidField(field, RANGES[index]))
}

/**
 * Describe an expression in plain language, where it can be described.
 *
 * Only the shapes the schedule builder produces are named. Anything else
 * returns an empty string rather than a wrong or hedged sentence — a summary
 * that quietly describes a different schedule than the one that will run is
 * worse than none, because it is believed.
 *
 * @param {string} expression The cron expression.
 * @return {string} A sentence, or '' when the expression cannot be named.
 */
export function describeCron(expression) {
	if (isValidCron(expression) === false) {
		return ''
	}

	const { minute, hour, monthday, month, weekday } = parseCron(expression)
	const numeric = (v) => /^\d+$/.test(v)
	const at = () => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

	if (month !== '*') {
		return ''
	}

	if (numeric(minute) && hour === '*' && monthday === '*' && weekday === '*') {
		return t('nextcloud-vue', 'Every hour, at {minute} minutes past.', { minute })
	}

	if (numeric(minute) && numeric(hour) && monthday === '*' && weekday === '*') {
		return t('nextcloud-vue', 'Every day at {time}.', { time: at() })
	}

	if (numeric(minute) && numeric(hour) && monthday === '*' && numeric(weekday)) {
		// 0 and 7 both mean Sunday.
		return t('nextcloud-vue', 'Every {weekday} at {time}.', {
			weekday: WEEKDAY_NAMES()[Number(weekday) % 7],
			time: at(),
		})
	}

	if (numeric(minute) && numeric(hour) && numeric(monthday) && weekday === '*') {
		return t('nextcloud-vue', 'Every month on day {day}, at {time}.', { day: monthday, time: at() })
	}

	return ''
}
