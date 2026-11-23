/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppRoot hands every page the library's built-in formatters with the app's
 * own on top (`cnFormatters`). A template's `{x|date}` then found the
 * built-in `date` formatter ("28 okt 2026", dateStyle medium) before its own
 * board date ("28 okt"), so the DqZakenKaart list wrote the current year. A
 * built-in formatter no longer shadows a template format of the same name;
 * an app's own formatter still does.
 *
 * @spec openspec/changes/template-date-not-shadowed/specs/template-date-not-shadowed/spec.md
 */
import { BUILT_IN_FORMATTERS } from '../../src/utils/builtInFormatters.js'
import { fillTemplate } from '../../src/utils/fillTemplate.js'

jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'nl',
	getCanonicalLocale: () => 'nl-NL',
	translate: (_app, s) => s,
	translatePlural: (_app, one, many, count) => (count === 1 ? one : many).replace('%n', String(count)),
}))

const NOW = new Date('2026-10-28T12:00:00')

describe('fillTemplate with the built-in formatters', () => {
	it('keeps its board date for {x|date}', () => {
		const formatters = { ...BUILT_IN_FORMATTERS }
		expect(fillTemplate('{d|date}', { d: '2026-10-28' }, NOW, { formatters })).toBe('28 okt')
	})

	it('still lets an app formatter of that name decide', () => {
		const formatters = { ...BUILT_IN_FORMATTERS, date: () => 'app date' }
		expect(fillTemplate('{d|date}', { d: '2026-10-28' }, NOW, { formatters })).toBe('app date')
	})
})
