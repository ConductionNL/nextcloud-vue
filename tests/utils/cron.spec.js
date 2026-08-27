// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// Five-field cron parsing, validation and description.
//
// The tests that matter here are the REFUSALS. A validator that accepts
// everything passes every happy-path test ever written, and the cost of a
// wrongly-accepted expression is a schedule that never fires — discovered at
// 03:00, by nobody.

import { describeCron, isValidCron, parseCron } from '../../src/utils/cron.js'

describe('parseCron', () => {
	it('splits an expression into named fields', () => {
		expect(parseCron('0 9 * * 1')).toEqual({
			minute: '0', hour: '9', monthday: '*', month: '*', weekday: '1',
		})
	})

	it('reads a missing field as *, so a half-typed expression is not a crash', () => {
		expect(parseCron('0 9')).toEqual({
			minute: '0', hour: '9', monthday: '*', month: '*', weekday: '*',
		})
	})

	it('tolerates extra whitespace', () => {
		expect(parseCron('  0   9  *  *  1  ').minute).toBe('0')
	})

	it('survives null and undefined', () => {
		expect(parseCron(null).minute).toBe('*')
		expect(parseCron(undefined).weekday).toBe('*')
	})
})

describe('isValidCron — accepts', () => {
	it.each([
		['* * * * *', 'every minute'],
		['0 9 * * 1', 'the documented example'],
		['*/15 * * * *', 'a step'],
		['0 0,12 * * *', 'a list'],
		['0 9-17 * * 1-5', 'ranges in two fields'],
		['0 9 1 1 *', 'a fixed date'],
		['0 0 * * 7', 'Sunday as 7, which every crontab accepts'],
		['0 0 * * 0', 'Sunday as 0'],
		['*/5 */2 * * *', 'steps in two fields'],
	])('accepts %s (%s)', (expression) => {
		expect(isValidCron(expression)).toBe(true)
	})
})

describe('isValidCron — refuses', () => {
	it.each([
		['', 'an empty string'],
		['0 9 * *', 'four fields'],
		['0 9 * * 1 2', 'six fields'],
		['60 * * * *', 'minute 60 — the range is 0-59'],
		['* 24 * * *', 'hour 24'],
		['* * 0 * *', 'day-of-month 0 — months start at 1'],
		['* * 32 * *', 'day-of-month 32'],
		['* * * 13 *', 'month 13'],
		['* * * * 8', 'weekday 8 — 7 is already Sunday'],
		['@daily', 'a shortcut, whose support varies by scheduler'],
		['0 9 * * mon', 'a weekday name'],
		['a b c d e', 'words'],
		['0 9 * * 1,', 'a trailing comma'],
		['0 9 * * 5-1', 'a backwards range'],
		['*/0 * * * *', 'a zero step, which would never advance'],
		['0/1/2 * * * *', 'two steps in one term'],
	])('refuses %s (%s)', (expression) => {
		expect(isValidCron(expression)).toBe(false)
	})
})

describe('describeCron', () => {
	it('names an hourly schedule', () => {
		expect(describeCron('30 * * * *')).toContain('30')
	})

	it('names a daily schedule with its time', () => {
		expect(describeCron('0 9 * * *')).toContain('09:00')
	})

	it('names the weekday, not its number', () => {
		expect(describeCron('0 9 * * 1')).toContain('Monday')
	})

	it('treats 0 and 7 as the same Sunday', () => {
		expect(describeCron('0 9 * * 0')).toBe(describeCron('0 9 * * 7'))
	})

	it('names a monthly schedule', () => {
		expect(describeCron('0 9 15 * *')).toContain('15')
	})

	/**
	 * ⚠️ SILENCE IS THE CORRECT ANSWER for a schedule this cannot name.
	 *
	 * A summary that confidently describes a DIFFERENT schedule than the one
	 * that will run is worse than no summary, because it is believed. So
	 * anything outside the shapes the builder produces returns '' rather than
	 * an approximation.
	 */
	it.each([
		['0 9 * * 1-5', 'a weekday range'],
		['*/15 * * * *', 'a step'],
		['0 9 1 1 *', 'a fixed month'],
		['0 0,12 * * *', 'a list'],
	])('says nothing about %s (%s)', (expression) => {
		expect(describeCron(expression)).toBe('')
	})

	it('says nothing about an invalid expression', () => {
		expect(describeCron('nonsense')).toBe('')
		expect(describeCron('')).toBe('')
	})
})
