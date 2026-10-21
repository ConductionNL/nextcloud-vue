/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A URL's query parameter whose whole value is an optional token
 * (`caseType=@workspace.caseType?`, as `api-call` params write it) is left
 * out while the token is empty, so a download link sends no `caseType=?`.
 */
import { interpolateUrlTokens } from '../../src/utils/interpolateUrlTokens.js'

describe('interpolateUrlTokens optional parameters', () => {
	const url = '/report?caseType=@workspace.caseType?&format=csv&period=@page.period?#top'

	it('drops an empty optional parameter, first or last', () => {
		expect(interpolateUrlTokens(url, { workspace: {} })).toBe('/report?format=csv#top')
		expect(interpolateUrlTokens('/r?a=@workspace.a?', { workspace: { a: '' } })).toBe('/r')
	})

	it('fills a set optional parameter', () => {
		expect(interpolateUrlTokens(url, { workspace: { caseType: 'woo', period: '3m' } })).toBe('/report?caseType=woo&format=csv&period=3m#top')
	})

	it('reads an optional config token from the config', () => {
		expect(interpolateUrlTokens('/r?x=1&reg=@config.register?', { config: { register: 'dossiq' } })).toBe('/r?x=1&reg=dossiq')
	})

	it('leaves a required token as before: empty, parameter kept', () => {
		expect(interpolateUrlTokens('/r?a=@workspace.a&b=1', { workspace: {} })).toBe('/r?a=&b=1')
	})
})
