/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqContactmoment "Onderwerp": a row shows the call's own subject, else the
 * request's category (`firstOf` on a row, as on a lead's title or subtitle).
 *
 * @spec openspec/changes/facts-row-first-of/specs/facts-row-first-of/spec.md#requirement-a-facts-row-can-show-the-first-value-that-gives-text
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const CONTENT = {
	columns: 2,
	fields: [{
		key: 'subject',
		label: 'Subject',
		firstOf: ['disposition_subject', { path: 'category', map: { afval: 'Waste' } }],
	}],
}

/**
 * @param {object} record The record shown.
 * @return {string} The text of the facts.
 */
function textOf(record) {
	return mount(CnFactsWidget, {
		props: { content: CONTENT, objectId: 't-1', objectData: record },
		global: { stubs: { NcLoadingIcon: true } },
	}).text()
}

describe('CnFactsWidget row firstOf', () => {
	it('shows the first value that gives text', () => {
		expect(textOf({ disposition_subject: 'Afvalpas', category: 'afval' })).toContain('Afvalpas')
		expect(textOf({ disposition_subject: 'Afvalpas', category: 'afval' })).not.toContain('Waste')
	})

	it('falls back to the next one, with its map', () => {
		expect(textOf({ category: 'afval' })).toContain('Waste')
	})

	it('drops the row when none gives text', () => {
		expect(textOf({})).not.toContain('Subject')
	})
})
