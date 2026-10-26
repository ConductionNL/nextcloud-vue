/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContact: "Laatst gewijzigd op 3 oktober" spells the month out, the year
 * only outside the current one.
 *
 * @spec openspec/changes/facts-longdate-format/specs/facts-widget/spec.md#requirement-a-facts-entry-can-write-a-date-with-the-month-spelled-out
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

function textFor(date) {
	return mount(CnFactsWidget, {
		props: {
			content: { fields: [{ as: 'text', parts: [{ text: 'Changed on' }, { path: 'updated', format: 'longdate' }], separator: ' ' }] },
			objectData: { updated: date },
		},
	}).text()
}

describe('CnFactsWidget longdate', () => {
	it('spells the month out without the year this year', () => {
		const year = new Date().getFullYear()
		const text = textFor(`${year}-10-03T10:00:00`)
		expect(text).toMatch(/(oktober|October)/)
		expect(text).toMatch(/\b3\b/)
		expect(text).not.toMatch(/\d{4}/)
	})

	it('adds the year outside this year', () => {
		const text = textFor('2019-10-03T10:00:00')
		expect(text).toMatch(/(oktober|October)/)
		expect(text).toMatch(/2019/)
	})
})
