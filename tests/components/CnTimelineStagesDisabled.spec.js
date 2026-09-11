/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTimelineStages: a stage marked `disabled` cannot be chosen, but keeps its
 * focus stop so a screen reader can reach it and read why.
 */
import { mount } from '@vue/test-utils'
import CnTimelineStages from '../../src/components/CnTimelineStages/CnTimelineStages.vue'

const STAGES = [
	{ id: 'a', label: 'Received' },
	{ id: 'b', label: 'In review', disabled: true },
	{ id: 'c', label: 'Closed' },
]

beforeAll(() => {
	Element.prototype.scrollIntoView = jest.fn()
})

/**
 * Mount the timeline.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountTimeline(props = {}) {
	return mount(CnTimelineStages, { props: { stages: STAGES, currentStage: 'a', clickable: true, ...props } })
}

const node = (w, index) => w.findAll('.cn-timeline-stages__stage')[index]

describe('CnTimelineStages: disabled stages', () => {
	it('marks a disabled stage for assistive technology and styling', () => {
		const w = mountTimeline()
		expect(node(w, 1).attributes('aria-disabled')).toBe('true')
		expect(node(w, 1).classes()).toContain('cn-timeline-stages__stage--disabled')
		expect(node(w, 2).attributes('aria-disabled')).toBeUndefined()
	})

	it('emits nothing when a disabled stage is clicked', async () => {
		const w = mountTimeline()
		await node(w, 1).trigger('click')
		expect(w.emitted('stage-click')).toBeUndefined()
	})

	it('emits nothing on Enter or Space on a disabled stage', async () => {
		const w = mountTimeline()
		await node(w, 1).trigger('keydown', { key: 'Enter' })
		await node(w, 1).trigger('keydown', { key: ' ' })
		expect(w.emitted('stage-click')).toBeUndefined()
	})

	it('keeps the disabled stage in the keyboard path', () => {
		const w = mountTimeline()
		expect(node(w, 1).attributes('tabindex')).toBe('-1')
	})

	it('still emits for a stage that is not disabled', async () => {
		const w = mountTimeline()
		await node(w, 2).trigger('click')
		expect(w.emitted('stage-click')[0][0].stage.id).toBe('c')
	})

	it('adds nothing when the timeline is not clickable', () => {
		const w = mountTimeline({ clickable: false })
		expect(node(w, 1).attributes('aria-disabled')).toBeUndefined()
		expect(node(w, 1).classes()).not.toContain('cn-timeline-stages__stage--disabled')
	})
})
