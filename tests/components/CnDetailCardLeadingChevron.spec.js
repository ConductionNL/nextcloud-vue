/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A collapsible card can put its chevron before the title (PqProspects
 * "Ideaal klantprofiel"), and its collapse button is named and reports its
 * state.
 *
 * @spec openspec/changes/detail-card-leading-chevron/specs/detail-card/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDetailCard from '../../src/components/CnDetailCard/CnDetailCard.vue'

describe('CnDetailCard leading chevron', () => {
	it('draws the collapse button before the title with chevronStart', () => {
		const w = mount(CnDetailCard, { props: { title: 'Ideal customer profile', collapsible: true, chevronStart: true } })
		const left = w.find('.cn-detail-card__header-left')
		expect(left.find('.cn-detail-card__collapse-btn').exists()).toBe(true)
		expect(w.find('.cn-detail-card__header-right .cn-detail-card__collapse-btn').exists()).toBe(false)
		const html = left.html()
		expect(html.indexOf('cn-detail-card__collapse-btn')).toBeLessThan(html.indexOf('cn-detail-card__title'))
	})

	it('keeps the chevron at the end by default', () => {
		const w = mount(CnDetailCard, { props: { title: 'Products', collapsible: true } })
		expect(w.find('.cn-detail-card__header-right .cn-detail-card__collapse-btn').exists()).toBe(true)
		expect(w.find('.cn-detail-card__header-left .cn-detail-card__collapse-btn').exists()).toBe(false)
	})

	it('reports the open state and flips it on a press', async () => {
		const w = mount(CnDetailCard, { props: { title: 'Products', collapsible: true, chevronStart: true } })
		const btn = () => w.find('.cn-detail-card__collapse-btn')
		expect(btn().attributes('aria-expanded')).toBe('true')
		expect(btn().attributes('aria-label')).toBe('Collapse')
		await w.find('.cn-detail-card__header').trigger('click')
		expect(btn().attributes('aria-expanded')).toBe('false')
		expect(btn().attributes('aria-label')).toBe('Expand')
	})

	it('draws no chevron on a card that does not collapse', () => {
		const w = mount(CnDetailCard, { props: { title: 'Products', chevronStart: true } })
		expect(w.find('.cn-detail-card__collapse-btn').exists()).toBe(false)
	})
})
