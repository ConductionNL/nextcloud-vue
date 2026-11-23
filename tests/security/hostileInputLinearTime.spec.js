/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Text that reaches a pattern from a manifest or a route stays linear on a
 * hostile input (CodeQL js/polynomial-redos), and fills as before on a normal
 * one.
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const { joinTemplateParts } = require('../../src/utils/fillTemplate.js')
const { fillMyTeamToken } = require('../../src/utils/myTeam.js')
const { stripTrailingSlashes } = require('../../src/utils/trailingSlashes.js')
const CnDashboardPage = require('../../src/components/CnDashboardPage/CnDashboardPage.vue').default

const N = 20000

/**
 * @param {Function} fn The work to time.
 * @return {number} Milliseconds it took.
 */
function msFor(fn) {
	const start = Date.now()
	fn()
	return Date.now() - start
}

describe('fillMyTeamToken', () => {
	it.each([
		['Cases of [team {myTeam}]', 'Noord', 'Cases of team Noord'],
		['Cases of [team {myTeam}]', '', 'Cases of '],
		['[a] and [b {myTeam} c] and [d]', 'X', '[a] and b X c and [d]'],
		['[a [b {myTeam}] c]', 'X', 'a [b X c]'],
		['[open {myTeam}', 'X', '[open X'],
		['plain {myTeam}', 'X', 'plain X'],
		['[{myTeam}][{myTeam}]', '', ''],
		['no token [here]', 'X', 'no token [here]'],
	])('fills %j with %j as %j', (text, name, expected) => {
		expect(fillMyTeamToken(text, name)).toBe(expected)
	})

	it('stays fast on a long run of brackets and tokens', () => {
		expect(msFor(() => fillMyTeamToken('[' + '[\\'.repeat(N) + '{myTeam}', 'X'))).toBeLessThan(500)
		expect(msFor(() => fillMyTeamToken('[{myTeam}' + '{myTeam}'.repeat(N), 'X'))).toBeLessThan(500)
	})
})

describe('joinTemplateParts', () => {
	const values = { a: 'A', b: '', c: 'C', 'x{y': 'XY' }
	const valueOf = (key) => values[key] ?? ''

	it.each([
		['{a} · {b} · {c}', 'A · C'],
		['Case {a}!', 'Case A!'],
		['{} {a}', '{} A'],
		['{x{y}', 'XY'],
		['{{a}}', '}'],
		['open {a} {', 'open A {'],
		['Static', 'Static'],
		['', ''],
		['{}', '{}'],
	])('fills %j as %j', (template, expected) => {
		expect(joinTemplateParts(template, valueOf)).toBe(expected)
	})

	it('stays fast on a long run of open braces', () => {
		expect(msFor(() => joinTemplateParts('{{' + '{{|'.repeat(N), valueOf))).toBeLessThan(500)
	})
})

describe('stripTrailingSlashes', () => {
	it('stays fast on a long run of slashes not at the end', () => {
		expect(msFor(() => stripTrailingSlashes('/'.repeat(N) + 'x'))).toBeLessThan(500)
	})
})

describe('CnDashboardPage fillTitleCount', () => {
	const fillTitleCount = (title, count) => CnDashboardPage.methods.fillTitleCount.call(
		{ widgetHeaders: count === undefined ? {} : { w: { count } } },
		{ widgetId: 'w' },
		title,
	)

	it.each([
		['Open cases {count}', 3, 'Open cases 3'],
		['Open cases {count}', undefined, 'Open cases'],
		['{count} open', undefined, 'open'],
		['A \n {count} b {count}', undefined, 'A b'],
		['No count', undefined, 'No count'],
	])('fills %j with %j as %j', (title, count, expected) => {
		expect(fillTitleCount(title, count)).toBe(expected)
	})

	it('stays fast on a long run of spaces', () => {
		expect(msFor(() => fillTitleCount(' '.repeat(N) + 'x', undefined))).toBeLessThan(500)
	})
})
