/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStepper is exported, and with `reachableIndex` a step after the current
 * one that was already reached stays a button (PqNieuwsbriefWizard).
 *
 * @spec openspec/changes/stepper-export-reachable/specs/wizard-dialog/spec.md
 */
import { mount } from '@vue/test-utils'
import CnStepper from '../../src/components/CnStepper/CnStepper.vue'
import { CnStepper as Exported } from '../../src/components/index.js'

const steps = ['basics', 'audience', 'content', 'delivery', 'ab', 'review'].map((id) => ({ id, label: id }))

/**
 * @param {object} w The mounted stepper.
 * @return {Array<string>} The step ids drawn as buttons.
 */
function buttons(w) {
	return w.findAll('.cn-stepper__item').filter((li) => li.find('button').exists()).map((li) => li.attributes('data-step-id'))
}

describe('CnStepper reachableIndex', () => {
	it('is exported from the components barrel', () => {
		expect(Exported).toBe(CnStepper)
	})

	it('makes every reached step other than the current one a button', () => {
		const w = mount(CnStepper, { props: { steps, currentIndex: 1, reachableIndex: 3, allowJumpBack: true, look: 'board' } })
		expect(buttons(w)).toEqual(['basics', 'content', 'delivery'])
	})

	it('emits jump for a reached step ahead', async () => {
		const w = mount(CnStepper, { props: { steps, currentIndex: 1, reachableIndex: 3, allowJumpBack: true, look: 'board' } })
		await w.find('[data-step-id="delivery"] button').trigger('click')
		expect(w.emitted('jump')).toEqual([['delivery']])
	})

	it('keeps only the finished steps as buttons without reachableIndex', () => {
		const w = mount(CnStepper, { props: { steps, currentIndex: 2, allowJumpBack: true, look: 'board' } })
		expect(buttons(w)).toEqual(['basics', 'audience'])
	})

	it('has no buttons without allowJumpBack', () => {
		const w = mount(CnStepper, { props: { steps, currentIndex: 1, reachableIndex: 3, look: 'board' } })
		expect(buttons(w)).toEqual([])
	})
})
