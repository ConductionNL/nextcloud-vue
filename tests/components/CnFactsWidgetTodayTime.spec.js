/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts entry can write a moment as its time today and as its date on
 * another day: PqWerkplekKlant "Bron: BRP, opgezocht 10:24, vastgelegd".
 *
 * @spec openspec/changes/facts-today-time/specs/facts-widget/spec.md#requirement-a-facts-entry-can-write-a-moment-as-today-s-time-or-its-date
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'

import '../../src/components/CnFactsWidget/index.js'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

/**
 * The text of the one row the card draws for a record.
 *
 * @param {object} record The object.
 * @return {string}
 */
function rowFor(record) {
	const w = mount(CnFactsWidget, {
		propsData: { objectData: record, content: { fields: [{ label: 'Source', template: '{via}, looked up {at:today-time}' }] } },
		provide: { cnTranslate: (key) => key },
		stubs: { NcLoadingIcon: true },
	})
	return w.find('.cn-facts-widget__row dd').text()
}

describe('CnFactsWidget: today-time', () => {
	it('writes a moment today as its time', () => {
		const today = new Date()
		today.setHours(10, 24, 0, 0)
		expect(rowFor({ via: 'BRP', at: today.toISOString() })).toBe('BRP, looked up 10:24')
	})

	it('writes a moment on another day as its date', () => {
		const text = rowFor({ via: 'BRP', at: '2025-02-14T10:24:00Z' })
		expect(text).toMatch(/^BRP, looked up .*14/)
		expect(text).not.toMatch(/10:24/)
	})
})
