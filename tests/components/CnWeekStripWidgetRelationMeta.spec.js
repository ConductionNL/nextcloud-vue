/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnWeekStripWidget: the source can extend a relation, and a meta field can
 * name alternatives, so an item reads "2026-4837 · Woo" from its case type.
 *
 * @spec openspec/changes/week-strip-meta-through-relation/specs/week-strip-meta-through-relation/spec.md#requirement-a-week-strip-item-can-name-a-field-of-a-related-record
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnWeekStripWidget from '../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path, params = {}) => Object.entries(params).reduce((url, [key, value]) => url.replace(`{${key}}`, value), path),
}))

const NOW = new Date(2026, 9, 7, 10, 0)
const flush = () => new Promise((resolve) => setTimeout(resolve))

const CONTENT = {
	source: { register: 'dossiq', schema: 'case', extend: ['caseType', ''] },
	dateField: 'deadline',
	titleField: 'title',
	metaFields: ['identifier', ['caseType.shortName', 'caseType.title']],
}

describe('CnWeekStripWidget: meta through a relation', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('asks the source to extend the named relations', async () => {
		const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: { results: [] } })
		mount(CnWeekStripWidget, { propsData: { content: CONTENT, now: NOW } })
		await flush()
		expect(get.mock.calls[0][1].params._extend).toEqual(['caseType'])
	})

	it('sends no _extend without extend', async () => {
		const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: { results: [] } })
		mount(CnWeekStripWidget, { propsData: { content: { ...CONTENT, source: { register: 'dossiq', schema: 'case' } }, now: NOW } })
		await flush()
		expect(get.mock.calls[0][1].params).not.toHaveProperty('_extend')
	})

	it('reads the first filled alternative of a meta field', async () => {
		jest.spyOn(axios, 'get').mockResolvedValue({
			data: {
				results: [
					{ id: 'a', title: 'Parkeervergunningen binnenstad', identifier: '2026-4837', deadline: '2026-10-05', caseType: { title: 'Woo-verzoek', shortName: 'Woo' } },
					{ id: 'b', title: 'Bezwaar parkeerboete Havenstraat', identifier: '2026-4836', deadline: '2026-10-07', caseType: { title: 'Bezwaar', shortName: '' } },
					{ id: 'c', title: 'Zonder zaaktype', identifier: '2026-0205', deadline: '2026-10-09', caseType: 'not-extended-uuid' },
				],
			},
		})
		const wrapper = mount(CnWeekStripWidget, { propsData: { content: CONTENT, now: NOW } })
		await flush()
		const meta = (day) => wrapper.find(`[data-day="${day}"] .cn-week-strip__meta`).text()
		expect(meta('2026-10-05')).toBe('2026-4837 · Woo')
		expect(meta('2026-10-07')).toBe('2026-4836 · Bezwaar')
		expect(meta('2026-10-09')).toBe('2026-0205')
	})
})
