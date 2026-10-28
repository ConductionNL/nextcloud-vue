/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqContactmoment "Over dit verzoek": the request's subtitle reads how long it
 * has waited and who holds it, "PQ-2026-0409 · verzoek · wacht 3 dagen · niet
 * toegewezen". A part's `days-since` format counts whole days, `phrase` writes
 * the count in words, and `empty` names a value that is not there.
 *
 * @spec openspec/changes/facts-days-since-phrase/specs/facts-days-since-phrase/spec.md#requirement-a-facts-part-can-say-how-many-days-ago-and-name-an-empty-value
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

/**
 * @param {number} days How many days back.
 * @return {string} That moment as an ISO string.
 */
function daysAgo(days) {
	const date = new Date()
	date.setDate(date.getDate() - days)
	return date.toISOString()
}

const SUBTITLE = [
	'reference',
	{ path: 'occurredAt', format: 'days-since', phrase: 'waiting {n} days', phraseOne: 'waiting 1 day', phraseZero: 'waiting since today' },
	{ path: 'assignee', format: 'user', empty: 'not assigned' },
]

/**
 * @param {object} record The record shown.
 * @return {string} The lead subtitle.
 */
function subtitleOf(record) {
	const w = mount(CnFactsWidget, {
		props: { content: { fields: [{ as: 'lead', title: 'title', subtitle: SUBTITLE }] }, objectId: 't-1', objectData: record },
		global: { stubs: { NcLoadingIcon: true } },
	})
	return w.find('.cn-facts-widget__lead-subtitle').text()
}

describe('CnFactsWidget days-since phrase and empty part', () => {
	it('says how many days the request has waited and that nobody holds it', () => {
		expect(subtitleOf({ title: 'Afvalpas', reference: 'PQ-2026-0409', occurredAt: daysAgo(3), assignee: '' }))
			.toBe('PQ-2026-0409 · waiting 3 days · not assigned')
	})

	it('uses the one-day and today phrases', () => {
		expect(subtitleOf({ title: 'A', reference: 'R', occurredAt: daysAgo(1) })).toBe('R · waiting 1 day · not assigned')
		expect(subtitleOf({ title: 'A', reference: 'R', occurredAt: daysAgo(0) })).toBe('R · waiting since today · not assigned')
	})

	it('leaves a part out without a date, and shows no empty text when there is a value', () => {
		const text = subtitleOf({ title: 'A', reference: 'R', assignee: 'pieter' })
		expect(text).not.toContain('waiting')
		expect(text).not.toContain('not assigned')
	})
})
