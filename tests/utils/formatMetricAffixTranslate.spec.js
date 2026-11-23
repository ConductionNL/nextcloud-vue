/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat's `format.prefix` / `format.suffix` go through the host translate
 * (screens-metric-affix-translate), as its label does: an app's nl catalogue
 * entry for " days" makes the tile read "1.5 dagen". A token is resolved,
 * never translated.
 */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import { formatMetricValue, translateMetricAffixes } from '../../src/utils/formatMetric.js'

jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	getCanonicalLocale: () => 'en-US',
}))

const dict = { ' days': ' dagen', 'ca. ': 'ong. ' }
const translate = (text) => dict[text] ?? text

describe('translateMetricAffixes', () => {
	it('translates a literal prefix and suffix', () => {
		expect(translateMetricAffixes({ style: 'decimal', prefix: 'ca. ', suffix: ' days' }, translate))
			.toEqual({ style: 'decimal', prefix: 'ong. ', suffix: ' dagen' })
	})

	it('leaves a token, an empty affix and a missing translate alone', () => {
		const fmt = { prefix: '@config.unit', suffix: '' }
		expect(translateMetricAffixes(fmt, translate)).toBe(fmt)
		const plain = { suffix: ' days' }
		expect(translateMetricAffixes(plain, null)).toBe(plain)
	})

	it('does not change the spec it is given', () => {
		const fmt = { suffix: ' days' }
		translateMetricAffixes(fmt, translate)
		expect(fmt.suffix).toBe(' days')
	})
})

describe('formatMetricValue with a translate', () => {
	it('joins the translated suffix', () => {
		expect(formatMetricValue(1.5, { style: 'decimal', decimals: 1, suffix: ' days' }, {}, null, translate)).toBe('1.5 dagen')
	})

	it('writes the suffix as given without a translate', () => {
		expect(formatMetricValue(1.5, { style: 'decimal', decimals: 1, suffix: ' days' }, {})).toBe('1.5 days')
	})

	it('resolves a config token and does not translate it', () => {
		const spy = jest.fn(translate)
		expect(formatMetricValue(3, { suffix: '@config.unit' }, { unit: ' days' }, null, spy)).toBe('3 days')
		expect(spy).not.toHaveBeenCalled()
	})
})

describe('CnStatWidget passes its translate to the formatter', () => {
	it('reads the suffix in the host language', () => {
		const wrapper = mount(CnStatWidget, {
			props: { content: { label: 'Average answer time', objectField: 'avg', format: { style: 'decimal', decimals: 1, suffix: ' days' } } },
			global: {
				provide: {
					cnTranslate: translate,
					cnObjectContext: ref({ objectId: 't-1', object: { avg: 1.5 }, register: 'pipelinq', schema: 'ticket' }),
				},
			},
		})
		expect(wrapper.find('.cn-stat-widget__value').text()).toBe('1.5 dagen')
		wrapper.unmount()
	})
})
