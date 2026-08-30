/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The canonical KPI look, asserted at the class level.
 *
 * The fleet's dashboards drew a grey KPI box INSIDE the white card that
 * CnWidgetWrapper already draws — a box in a box on every app — while the one
 * tile that looked right (`delta`) looked right only because it had never
 * joined the shared stylesheet. The card is now flat and horizontal by
 * default, and the old look is opt-in.
 *
 * These assertions are on the CLASSES, not the pixels: the classes are the
 * contract between the three components and the one stylesheet, and a jsdom
 * test cannot see a background colour that lives in an external sheet anyway.
 * What each class then paints is kpi-card.css's job.
 */

import { mount } from '@vue/test-utils'
import CnStatsBlock from '@/components/CnStatsBlock/CnStatsBlock.vue'
import CnStatWidget from '@/components/CnStatWidget/CnStatWidget.vue'
import CnDeltaWidget from '@/components/CnDeltaWidget/CnDeltaWidget.vue'

const mountStat = async (content = {}) => {
	const w = mount(CnStatWidget, {
		propsData: { content: { label: 'Revenue', icon: 'Cash', ...content } },
		stubs: { NcLoadingIcon: { template: '<div />' }, CnWidgetIcon: { template: '<div />' } },
	})
	await w.vm.$nextTick()
	return w
}

describe('the canonical KPI card — CnStatWidget', () => {
	it('is horizontal and flat by default', async () => {
		const c = (await mountStat()).classes()
		expect(c).toContain('cn-kpi-card')
		expect(c).toContain('cn-kpi-card--horizontal')
		expect(c).toContain('cn-kpi-card--flat')
		// The grey box is what produced the card-in-a-card.
		expect(c).not.toContain('cn-kpi-card--filled')
		expect(c).not.toContain('cn-kpi-card--vertical')
	})

	it('stacks on content.layout: vertical', async () => {
		const c = (await mountStat({ layout: 'vertical' })).classes()
		expect(c).toContain('cn-kpi-card--vertical')
		expect(c).not.toContain('cn-kpi-card--horizontal')
	})

	it('draws its own box only when content.flat is explicitly false', async () => {
		const c = (await mountStat({ flat: false })).classes()
		expect(c).toContain('cn-kpi-card--filled')
		expect(c).not.toContain('cn-kpi-card--flat')
	})

	it('a vertical tile is still flat — the two are independent', async () => {
		const c = (await mountStat({ layout: 'vertical' })).classes()
		expect(c).toContain('cn-kpi-card--vertical')
		expect(c).toContain('cn-kpi-card--flat')
	})
})

describe('the canonical KPI card — CnStatsBlock', () => {
	const mountBlock = (propsData = {}) => mount(CnStatsBlock, {
		propsData: { title: 'Cases', count: 4, ...propsData },
		stubs: { NcLoadingIcon: { template: '<div />' } },
	})

	it('is horizontal and unfilled by default', () => {
		const c = mountBlock().classes()
		expect(c).toContain('cn-kpi-card')
		expect(c).toContain('cn-kpi-card--horizontal')
		expect(c).not.toContain('cn-kpi-card--filled')
		expect(c).not.toContain('cn-kpi-card--vertical')
	})

	it('stacks on `vertical` and boxes on `filled`', () => {
		const c = mountBlock({ vertical: true, filled: true }).classes()
		expect(c).toContain('cn-kpi-card--vertical')
		expect(c).toContain('cn-kpi-card--filled')
		expect(c).not.toContain('cn-kpi-card--horizontal')
	})

	it('still accepts the deprecated `horizontal` prop without changing the look', () => {
		const c = mountBlock({ horizontal: true }).classes()
		expect(c).toContain('cn-kpi-card--horizontal')
		expect(c).not.toContain('cn-kpi-card--vertical')
	})
})

describe('the canonical KPI card — CnDeltaWidget', () => {
	it('renders the shared card markup rather than a lookalike of its own', async () => {
		const w = mount(CnDeltaWidget, {
			propsData: { content: { label: 'Won deals', icon: 'Trophy' } },
			stubs: { NcLoadingIcon: { template: '<div />' }, CnWidgetIcon: { template: '<div />' } },
		})
		await w.vm.$nextTick()

		// The reference tile must BE the canonical card, not resemble it —
		// resembling it is how the fleet ended up with two KPI looks.
		expect(w.classes()).toContain('cn-kpi-card')
		expect(w.classes()).toContain('cn-kpi-card--horizontal')
		expect(w.classes()).toContain('cn-kpi-card--flat')
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(true)
		expect(w.find('.cn-kpi-card__title').exists()).toBe(true)
		// The legacy class stays on the same element for app CSS.
		expect(w.classes()).toContain('cn-delta-widget')
	})
})
