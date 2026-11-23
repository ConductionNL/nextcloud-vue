/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * due-text-done-and-date: `{date}` in the due labels, and a done row
 * (DqZaak Adviezen: "uiterlijk 8 mrt, 2 dagen over", "ontvangen 6 mrt,
 * negatief").
 *
 * @spec openspec/changes/due-text-done-and-date/specs/due-text/spec.md#requirement-a-due-text-names-the-date-and-a-done-row
 */
import { resolveDue } from '../../src/utils/dueText.js'

jest.mock('../../src/utils/boardDate.js', () => ({
	...jest.requireActual('../../src/utils/boardDate.js'),
	formatBoardDate: (date) => `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
}))

const NOW = new Date('2026-03-10T12:00:00Z')
const DUE = {
	field: 'dueAt',
	overdueLabel: { one: 'uiterlijk {date}, {count} dag over', other: 'uiterlijk {date}, {count} dagen over' },
	upcomingLabel: { one: 'uiterlijk {date}, nog {count} dag', other: 'uiterlijk {date}, nog {count} dagen' },
	doneField: 'receivedAt',
	doneLabel: 'ontvangen {date}, {value}',
	doneValueField: 'outcome',
	doneValueLabels: { negative: 'negatief', positive: 'positief' },
}

describe('resolveDue: date and done', () => {
	it('fills {date} in the overdue and upcoming labels', () => {
		expect(resolveDue('2026-03-08', DUE, (x) => x, NOW, {})).toEqual({ text: 'uiterlijk 8/3, 2 dagen over', tone: 'danger' })
		expect(resolveDue('2026-03-14', DUE, (x) => x, NOW, {}).text).toBe('uiterlijk 14/3, nog 4 dagen')
	})

	it('reads a done row as the done label in the muted tone, its value named', () => {
		const row = { dueAt: '2026-03-08', receivedAt: '2026-03-06', outcome: 'negative' }
		expect(resolveDue(row.dueAt, DUE, (x) => x, NOW, row)).toEqual({ text: 'ontvangen 6/3, negatief', tone: 'muted' })
	})

	it('drops a trailing separator when the done value is empty, and keeps the term without a done date', () => {
		expect(resolveDue('2026-03-08', DUE, (x) => x, NOW, { receivedAt: '2026-03-06' }).text).toBe('ontvangen 6/3')
		expect(resolveDue('2026-03-08', DUE, (x) => x, NOW, { receivedAt: null }).tone).toBe('danger')
	})
})
