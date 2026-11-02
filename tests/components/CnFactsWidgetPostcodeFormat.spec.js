/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * facts `format: "postcode"`: a Dutch postcode stored as the registers keep it
 * ("2999AA") is written as people read it ("2999 AA"), as the boards draw an
 * address (DqContact "Woonadres", DqOrganisatie "KvK en adres"). Anything that
 * is not a Dutch postcode is written as it is.
 *
 * @spec openspec/changes/facts-postcode-format/specs/facts-postcode-format/spec.md#requirement-a-facts-part-can-write-a-dutch-postcode-with-its-space
 */
import { mount } from '@vue/test-utils'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'
import { BUILT_IN_FORMATTERS, formatPostcode } from '../../src/utils/builtInFormatters.js'

/**
 * @param {object} record The record.
 * @return {object} Wrapper.
 */
function mountAddress(record) {
	return mount(CnFactsWidget, {
		props: {
			objectData: record,
			content: { fields: [{ as: 'text', parts: [{ path: 'residence.postcode', format: 'postcode' }, 'residence.city'], separator: ' ' }] },
		},
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcLoadingIcon: true } },
	})
}

describe('facts format postcode', () => {
	it('writes a stored Dutch postcode with its space (DqContact Woonadres)', () => {
		const w = mountAddress({ id: 'p', residence: { postcode: '2999AA', city: 'Zuiddrecht' } })
		expect(w.find('.cn-facts-widget__text').text()).toBe('2999 AA Zuiddrecht')
	})

	it('leaves a postcode that already has its space, and lower case letters upper case', () => {
		expect(formatPostcode('2999 AA')).toBe('2999 AA')
		expect(formatPostcode('2999aa')).toBe('2999 AA')
	})

	it('writes anything else as it is', () => {
		expect(formatPostcode('B-1000')).toBe('B-1000')
		expect(formatPostcode('')).toBe('')
		expect(formatPostcode(null)).toBe('')
	})

	it('is a built-in formatter for tables too', () => {
		expect(BUILT_IN_FORMATTERS.postcode).toBe(formatPostcode)
	})
})
