/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-4
 */
import { mount } from '@vue/test-utils'
import CnProcessSteps from '../../src/components/CnProcessSteps/CnProcessSteps.vue'

const steps = [
	{ id: 'a', label: 'One' },
	{ id: 'b', label: 'Two' },
	{ id: 'c', label: 'Three' },
]

describe('CnProcessSteps', () => {
	it('emits NL Design process-steps classes on the rendered markup', () => {
		const w = mount(CnProcessSteps, { props: { steps, current: 'b' } })
		expect(w.find('nav.denhaag-process-steps').exists()).toBe(true)
		expect(w.findAll('li.denhaag-process-steps__step')).toHaveLength(3)
		expect(w.html()).not.toMatch(/gemeente-denhaag\/process-steps/)
	})

	it('tells current, completed and upcoming apart without colour', () => {
		const w = mount(CnProcessSteps, { props: { steps, current: 'b' } })
		const items = w.findAll('li.denhaag-process-steps__step')
		expect(items[0].classes()).toContain('denhaag-process-steps__step--checked')
		expect(items[0].text()).toContain('(completed)')
		expect(items[1].attributes('aria-current')).toBe('step')
		expect(items[1].text()).toContain('(current step)')
		expect(items[2].attributes('aria-current')).toBeUndefined()
		expect(items[2].text()).toContain('(upcoming)')
	})

	it('selects a navigable step and ignores a non-navigable group', async () => {
		const grouped = [{ id: 'g', label: 'G', navigable: false, children: [{ id: 'g1', label: 'G1' }] }, ...steps]
		const w = mount(CnProcessSteps, { props: { steps: grouped, current: 'a' } })
		expect(w.find('.denhaag-process-steps__step > .denhaag-process-steps__heading').exists()).toBe(true)
		await w.findAll('button')[0].trigger('click')
		expect(w.emitted('select')[0]).toEqual(['g1'])
	})
})
