// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Reading OpenRegister's per-lens report and turning it into the
 * explanation a list shows instead of its generic empty text.
 *
 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
 */

import { lensUnavailableText, readLensReports } from '../../src/utils/lensAvailability.js'

const report = (reason) => ({ recent: { available: false, reason } })

describe('readLensReports', () => {
	it('returns @self.lenses of the body', () => {
		const lenses = report('anonymous')
		expect(readLensReports({ results: [], '@self': { lenses } })).toBe(lenses)
	})

	it.each([
		['no body', undefined],
		['no @self', { results: [] }],
		['@self without lenses', { '@self': { ignoredFilters: [] } }],
		['lenses as a list', { '@self': { lenses: [] } }],
		['a bare array body', []],
	])('returns {} for %s', (_label, body) => {
		expect(readLensReports(body)).toEqual({})
	})
})

describe('lensUnavailableText', () => {
	it.each([
		['audit-trail-disabled', 'This server does not keep track of what you open.'],
		['anonymous', 'Log in to see what you opened recently.'],
		['read-history-unavailable', 'Your recent items are not available right now.'],
	])('explains %s', (reason, text) => {
		expect(lensUnavailableText(report(reason))).toBe(text)
	})

	it.each([
		['no report', {}],
		['a null report', null],
		['an available lens', { recent: { available: true, reason: null } }],
		['an unknown reason', report('something-new')],
		['no reason', { recent: { available: false, reason: null } }],
		['a lens without built-in text', { watching: { available: false, reason: 'anonymous' } }],
	])('is empty for %s, so the caller keeps its own empty text', (_label, reports) => {
		expect(lensUnavailableText(reports)).toBe('')
	})

	it('prefers the app text for this lens, then for the reason, then the built-in text', () => {
		const reports = report('audit-trail-disabled')
		expect(lensUnavailableText(reports, {
			'recent.audit-trail-disabled': 'Deze server houdt niet bij welke zaken je opent.',
			'audit-trail-disabled': 'Generic',
		})).toBe('Deze server houdt niet bij welke zaken je opent.')
		expect(lensUnavailableText(reports, { 'audit-trail-disabled': 'Generic' })).toBe('Generic')
		expect(lensUnavailableText(reports, { 'watching.audit-trail-disabled': 'Other lens' }))
			.toBe('This server does not keep track of what you open.')
	})

	it('lets another lens use the same mechanism through app text', () => {
		expect(lensUnavailableText(
			{ watching: { available: false, reason: 'anonymous' } },
			{ 'watching.anonymous': 'Log in to see what you follow.' },
		)).toBe('Log in to see what you follow.')
	})

	it('skips an available lens and explains the unavailable one', () => {
		expect(lensUnavailableText({
			favourite: { available: true, reason: null },
			recent: { available: false, reason: 'anonymous' },
		})).toBe('Log in to see what you opened recently.')
	})
})
