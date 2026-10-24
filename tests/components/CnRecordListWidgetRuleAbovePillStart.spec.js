/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `rows` record list can rule above its first row and lead each row with
 * its pill, as DqZaakDocumenten draws "Weigeringsgronden tot nu toe".
 *
 * @spec openspec/changes/record-list-rule-above-and-pill-first/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const GROUNDS = [{ id: 'g1', code: '5.1.2e', label: 'Eerbiediging van de persoonlijke levenssfeer' }]

/**
 * @param {object} extra Extra content keys.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The list.
 */
async function mountList(extra = {}) {
	axios.get.mockResolvedValue({ data: { results: GROUNDS, total: 1 } })
	const w = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 's', presentation: 'rows', title: '{label}', pill: { field: 'code' }, ...extra } },
		global: { stubs: { NcLoadingIcon: true, CnIcon: true } },
	})
	await flushPromises()
	return w
}

describe('CnRecordListWidget ruleAbove', () => {
	it('marks the list to rule above its first row', async () => {
		expect((await mountList({ ruleAbove: true })).classes()).toContain('cn-record-list--rule-above')
	})

	it('leaves the first row unruled by default', async () => {
		expect((await mountList()).classes()).not.toContain('cn-record-list--rule-above')
	})
})

describe('CnRecordListWidget pillAt start', () => {
	it('draws the pill before the title and not at the end', async () => {
		const row = (await mountList({ pillAt: 'start' })).find('.cn-record-list__row')
		const order = [...row.element.querySelectorAll('.cn-record-list__pill-start, .cn-record-list__title, .cn-record-list__aside')].map((e) => e.className)
		expect(order[0]).toContain('cn-record-list__pill-start')
		expect(row.find('.cn-record-list__pill-start').text()).toContain('5.1.2e')
		expect(row.find('.cn-record-list__aside').exists()).toBe(false)
	})

	it('keeps the pill at the end by default', async () => {
		const row = (await mountList()).find('.cn-record-list__row')
		expect(row.find('.cn-record-list__pill-start').exists()).toBe(false)
		expect(row.find('.cn-record-list__aside').text()).toContain('5.1.2e')
	})
})
