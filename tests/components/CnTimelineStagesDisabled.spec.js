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

describe('CnTimelineStages: a blocked stage reports the attempt', () => {
	// IT STILL REFUSES THE MOVE. What changes is that it says the person tried,
	// which is what lets a consumer answer them. Before this a blocked stage
	// was silent to anyone not running a screen reader.
	it('emits stage-blocked instead of stage-click on a click', async () => {
		const w = mountTimeline()
		await w.findAll('.cn-timeline-stages__stage')[1].trigger('click')

		expect(w.emitted('stage-click')).toBeUndefined()
		expect(w.emitted('stage-blocked')[0][0].stage.id).toBe('b')
	})

	it('emits stage-blocked on Enter and on Space', async () => {
		const w = mountTimeline()
		await w.findAll('.cn-timeline-stages__stage')[1].trigger('keydown', { key: 'Enter' })
		await w.findAll('.cn-timeline-stages__stage')[1].trigger('keydown', { key: ' ' })

		expect(w.emitted('stage-click')).toBeUndefined()
		expect(w.emitted('stage-blocked')).toHaveLength(2)
	})

	it('emits nothing at all when the timeline is not clickable', async () => {
		const w = mountTimeline({ clickable: false })
		await w.findAll('.cn-timeline-stages__stage')[1].trigger('click')

		expect(w.emitted('stage-click')).toBeUndefined()
		expect(w.emitted('stage-blocked')).toBeUndefined()
	})

	it('emits stage-click, not stage-blocked, for a stage that is open', async () => {
		const w = mountTimeline()
		await w.findAll('.cn-timeline-stages__stage')[0].trigger('click')

		expect(w.emitted('stage-click')[0][0].stage.id).toBe('a')
		expect(w.emitted('stage-blocked')).toBeUndefined()
	})
})

// A REFUSED STAGE MUST LOOK REFUSED. On a real case page every stage the record
// could not reach rendered in the same grey, so the stage the person was aiming
// at was the faintest thing on the strip and the timeline read as broken rather
// than as guarded. `blocked` is the stage a guard refused; `disabled` alone is a
// stage that is simply further down the process, and it stays grey on purpose.
describe('CnTimelineStages: a refused stage looks refused', () => {
	const REFUSED = [
		{ id: 'a', label: 'Received' },
		{
			id: 'b',
			label: 'In review',
			disabled: true,
			blocked: true,
			hint: 'Vereist veld ontbreekt: description',
		},
		{ id: 'c', label: 'Closed', disabled: true },
	]

	/**
	 * Mount a timeline holding one refused stage and one merely later one.
	 *
	 * @param {object} props Extra props.
	 * @return {object} The wrapper.
	 */
	function mountRefused(props = {}) {
		return mount(CnTimelineStages, { props: { stages: REFUSED, currentStage: 'a', clickable: true, ...props } })
	}

	it('gives the refused stage its own class', () => {
		const w = mountRefused()
		expect(node(w, 1).classes()).toContain('cn-timeline-stages__stage--blocked')
	})

	it('leaves a stage that is merely later in the process uncoloured', () => {
		const w = mountRefused()
		expect(node(w, 2).classes()).toContain('cn-timeline-stages__stage--disabled')
		expect(node(w, 2).classes()).not.toContain('cn-timeline-stages__stage--blocked')
	})

	// COLOUR IS NOT ENOUGH ON ITS OWN (WCAG 2.2 AA, 1.4.1): orange against grey
	// is exactly the pair a colour-blind reader cannot separate.
	it('marks the refused indicator with a shape as well as a colour', () => {
		const w = mountRefused()
		expect(node(w, 1).find('.cn-timeline-stages__alert').exists()).toBe(true)
		expect(node(w, 2).find('.cn-timeline-stages__alert').exists()).toBe(false)
	})

	it('puts the reason on the title attribute, so a mouse-over reveals it', () => {
		const w = mountRefused()
		expect(node(w, 1).attributes('title')).toBe('Vereist veld ontbreekt: description')
	})

	it('renders no title at all for a stage with nothing to explain', () => {
		const w = mountRefused()
		expect(node(w, 2).attributes('title')).toBeUndefined()
	})

	// THE STAGE THE RECORD IS ON IS NEVER REFUSED. Painting a refusal on the
	// place the record already sits says no to a move nobody is making, so the
	// component refuses it even when a consumer asks for it.
	it('never styles the current stage as refused', () => {
		const w = mountRefused({ currentStage: 'b' })
		expect(node(w, 1).classes()).toContain('cn-timeline-stages__stage--current')
		expect(node(w, 1).classes()).not.toContain('cn-timeline-stages__stage--blocked')
		expect(node(w, 1).find('.cn-timeline-stages__alert').exists()).toBe(false)
	})

	it('colours nothing when the timeline is not clickable', () => {
		const w = mountRefused({ clickable: false })
		expect(node(w, 1).classes()).not.toContain('cn-timeline-stages__stage--blocked')
	})
})
