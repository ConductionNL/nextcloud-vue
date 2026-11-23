/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A stacked bar with `headerCount: true` reports the sum of its segments to
 * its card (DqMijnWerk "Mijn 14 zaken per stap").
 *
 * @spec openspec/changes/widget-title-count/specs/widget-title-count/spec.md#requirement-a-widget-title-can-carry-the-total-its-widget-reports
 */
import { mount } from '@vue/test-utils'
import CnStackedBarWidget from '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'

const SEGMENTS = [
	{ label: 'Received', value: 3 },
	{ label: 'In progress', value: 6 },
	{ label: 'Decision', value: 3 },
	{ label: 'Publish', value: 2 },
]

describe('CnStackedBarWidget: the header count', () => {
	it('reports the total under headerCount', async () => {
		const w = mount(CnStackedBarWidget, { props: { content: { segments: SEGMENTS, headerCount: true } } })
		await w.vm.$nextTick()
		const events = w.emitted('header') || []
		expect(events.length).toBeGreaterThan(0)
		expect(events[events.length - 1][0].count).toBe(14)
	})

	it('reports nothing without headerCount', async () => {
		const w = mount(CnStackedBarWidget, { props: { content: { segments: SEGMENTS } } })
		await w.vm.$nextTick()
		expect(w.emitted('header')).toBeUndefined()
	})
})
