/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.inset: true` draws the week strip and the stacked bar inside the
 * board's inset. Without it both run from card edge to card edge as before.
 * The geometry is measured in e2e/pixel-gaps-3.e2e.js.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-strip-and-a-stacked-bar-can-take-the-board-inset
 */
import { mount } from '@vue/test-utils'
import CnStackedBarWidget from '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'
import CnWeekStripWidget from '../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'

const SEGMENTS = [{ key: 'a', label: 'Received', value: 3 }, { key: 'b', label: 'In progress', value: 6 }]
const now = new Date('2026-10-05T10:00:00')

describe('CnStackedBarWidget: inset', () => {
	it('has no inset without the key', () => {
		const w = mount(CnStackedBarWidget, { propsData: { content: { segments: SEGMENTS } } })
		expect(w.classes()).not.toContain('cn-stacked-bar--inset')
	})

	it('takes the board inset with inset: true', () => {
		const w = mount(CnStackedBarWidget, { propsData: { content: { segments: SEGMENTS, inset: true } } })
		expect(w.classes()).toContain('cn-stacked-bar--inset')
	})
})

describe('CnWeekStripWidget: inset', () => {
	it('has no inset without the key', () => {
		const w = mount(CnWeekStripWidget, { propsData: { content: { items: [] }, now } })
		expect(w.classes()).not.toContain('cn-week-strip--inset')
	})

	it('takes the board inset with inset: true', () => {
		const w = mount(CnWeekStripWidget, { propsData: { content: { items: [], inset: true }, now } })
		expect(w.classes()).toContain('cn-week-strip--inset')
	})
})
