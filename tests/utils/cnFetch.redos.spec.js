/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Trimming trailing slashes off the public base URL is linear (CodeQL
 * js/polynomial-redos on the former `/\/+$/`).
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const { stripTrailingSlashes, configureCnFetch } = require('../../src/utils/cnFetch.js')

describe('stripTrailingSlashes', () => {
	it.each([
		['https://a.example/api', 'https://a.example/api'],
		['https://a.example/api/', 'https://a.example/api'],
		['https://a.example/api///', 'https://a.example/api'],
		['///', ''],
		['', ''],
		['/a/b', '/a/b'],
	])('trims %p to %p', (input, expected) => {
		expect(stripTrailingSlashes(input)).toBe(expected)
	})

	it('finishes fast on 50k slashes, with or without a non-slash tail', () => {
		const started = Date.now()
		expect(stripTrailingSlashes('/'.repeat(50000))).toBe('')
		expect(stripTrailingSlashes('/'.repeat(50000) + 'x')).toBe('/'.repeat(50000) + 'x')
		expect(stripTrailingSlashes('x' + '/'.repeat(50000))).toBe('x')
		configureCnFetch({ host: 'public', baseUrl: 'https://a.example' + '/'.repeat(50000) })
		expect(Date.now() - started).toBeLessThan(500)
	})
})
