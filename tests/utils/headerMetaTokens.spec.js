/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The detail header meta line (boards PqAfspraak, PqKassabon, PqKassadienst,
 * PqZRapport): enum labels, a user's display name, a long date, and an empty
 * token that drops itself and its separator.
 *
 * @spec openspec/changes/screens-header-meta-tokens/specs/detail-page-board-look/spec.md#requirement-the-header-meta-line-formats-users-long-dates-and-enum-labels
 */
jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'nl',
	getCanonicalLocale: () => 'nl-NL',
	translate: (_app, s, vars) => s.replace(/\{(\w+)\}/g, (match, key) => (vars && key in vars ? String(vars[key]) : match)),
	translatePlural: (_app, one) => one,
}))
jest.mock('../../src/utils/userAutocomplete.js', () => ({
	resolveNextcloudUser: jest.fn((uid) => Promise.resolve(uid === 'sanne' ? { id: 'sanne', label: 'Sanne de Vries' } : { id: uid, label: uid })),
}))

const { nextTick } = require('vue')
const { formatLongDate } = require('../../src/utils/fillTemplate.js')
const { resolveHeaderMeta } = require('../../src/utils/headerMeta.js')
const { resolveNextcloudUser } = require('../../src/utils/userAutocomplete.js')
const { clearUserDisplayNames, userDisplayName } = require('../../src/utils/userDisplayName.js')

const NOW = new Date('2026-10-11T12:00:00')
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
	clearUserDisplayNames()
	resolveNextcloudUser.mockClear()
})

describe('header meta tokens', () => {
	it('reads an enum field as its translated label', () => {
		const schema = { properties: { source: { type: 'string', enum: ['phone'], 'x-enum-labels': { phone: 'Phone' } } } }
		const line = resolveHeaderMeta('via {source}', { source: 'phone' }, { now: NOW, schema, translate: (t) => (t === 'Phone' ? 'Telefoon' : t) })
		expect(line).toBe('via Telefoon')
	})

	it('drops an empty token with its separator, and the whole line when nothing is filled', () => {
		const tpl = '{amount|currency:EUR} · {cashier} · {at|longdate} {at|time}'
		expect(resolveHeaderMeta(tpl, { amount: 96.41, cashier: '', at: '2026-10-07T11:43:00' }, NOW)).toMatch(/^€\s?96,41 · 7 oktober 11:43$/)
		expect(resolveHeaderMeta('via {channel}', { channel: '' }, NOW)).toBe('')
		expect(resolveHeaderMeta('{a} · {b}', { a: '', b: 'x' }, NOW)).toBe('x')
	})

	it('writes the month out, with the year outside the current year or on request', () => {
		expect(formatLongDate('2026-10-07T11:43:00', NOW)).toBe('7 oktober')
		expect(formatLongDate('2026-10-06T09:00:00', NOW, true)).toBe('6 oktober 2026')
		expect(resolveHeaderMeta('{till} · {day|longdate:year}', { till: 'Balie 1', day: '2026-10-06' }, NOW)).toBe('Balie 1 · 6 oktober 2026')
		expect(formatLongDate('2025-02-14', NOW)).toBe('14 februari 2025')
	})

	it('looks a user up once and fills the name when it arrives', async () => {
		const object = { cashier: 'sanne', start: '2026-10-07T09:00:00', end: '2026-10-07T16:45:00' }
		const tpl = '{cashier|user} · {start|time} tot {end|time}'
		expect(resolveHeaderMeta(tpl, object, NOW)).toBe('09:00 tot 16:45')
		await flush()
		await nextTick()
		expect(resolveHeaderMeta(tpl, object, NOW)).toBe('Sanne de Vries · 09:00 tot 16:45')
		expect(userDisplayName('sanne')).toBe('Sanne de Vries')
		expect(resolveNextcloudUser).toHaveBeenCalledTimes(1)
	})

	it('reads an unknown user as its id', async () => {
		userDisplayName('ghost')
		await flush()
		expect(userDisplayName('ghost')).toBe('ghost')
	})
})
