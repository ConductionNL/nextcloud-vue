// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget: five cards over one case read its case type once.
 *
 * Measured on the dossiq case page (24 Nov 2026): every data card read the
 * case type the record points at by itself, five reads of one record on open.
 * @spec openspec/changes/related-record-read-once/specs/data-widget/spec.md#requirement-a-related-record-is-read-once-per-page-open
 */

import axios from '@nextcloud/axios'
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import { forgetRelatedReads } from '../../src/utils/readRelatedOnce.js'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (url, params) => url.replace(/\{(\w+)\}/g, (match, key) => (params || {})[key]),
}))

const schema = {
	properties: {
		title: { type: 'string' },
		caseType: { type: 'string', format: 'uuid', $ref: 'caseType' },
	},
}

function mountCard() {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData: { title: 'Request', caseType: 'type-1' } },
		mocks: { t: (app, s) => s },
		provide: { cnObjectContext: { register: 'dossiq', schema: 'case' } },
	})
}

describe('CnObjectDataWidget relation names on a page of cards', () => {
	let get

	beforeEach(() => {
		forgetRelatedReads()
		get = jest.spyOn(axios, 'get').mockImplementation(async () => ({ data: { id: 'type-1', title: 'Woo request' } }))
	})

	afterEach(() => get.mockRestore())

	it('reads the related case type once for five cards and names it in each', async () => {
		const cards = [1, 2, 3, 4, 5].map(() => mountCard())
		await flushPromises()

		const reads = get.mock.calls.filter(([url]) => url === '/apps/openregister/api/objects/dossiq/caseType/type-1')
		expect(reads).toHaveLength(1)
		for (const card of cards) {
			expect(card.vm.relatedLabels['type-1']).toBe('Woo request')
		}
	})

	it('reads it again for the next card after a failed read', async () => {
		get.mockRejectedValueOnce(new Error('503'))
		const first = mountCard()
		await flushPromises()
		expect(first.vm.relatedLabels['type-1']).toBe('type-1')

		const second = mountCard()
		await flushPromises()
		expect(get.mock.calls.filter(([url]) => /caseType\/type-1$/.test(url))).toHaveLength(2)
		expect(second.vm.relatedLabels['type-1']).toBe('Woo request')
	})
})
