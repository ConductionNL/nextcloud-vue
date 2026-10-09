/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility of the wizard stepper and the form error summary in both
 * looks (screens-wizard-parity task 2, screens-form-parity task 4). The stepper
 * is an ordered list with the current step marked; the old tablist roles are
 * gone.
 *
 * @spec openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md#requirement-the-stepper-is-an-ordered-list-with-the-current-step-marked
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnFormErrorSummary = require('../../src/components/CnFormErrorSummary/CnFormErrorSummary.vue').default
const CnFormField = require('../../src/components/CnFormField/CnFormField.vue').default
const CnStepper = require('../../src/components/CnStepper/CnStepper.vue').default

const steps = [
	{ id: 'a', label: 'Audience' },
	{ id: 'b', label: 'Course' },
	{ id: 'c', label: 'Confirm' },
]

describe('wizard stepper and form errors: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	describe.each([['board', 'board'], ['nextcloud', 'nextcloud']])('CnStepper in the %s look', (_name, look) => {
		it.each([[true], [false]])('has no WCAG 2.1 AA violations (allowJumpBack %s)', async (allowJumpBack) => {
			wrapper = mountAttached(CnStepper, { propsData: { steps, currentIndex: 2, look, allowJumpBack } })
			await expectAccessible(wrapper)
		})

		it('focuses finished steps only with allowJumpBack, in order, and never the current one', () => {
			wrapper = mountAttached(CnStepper, { propsData: { steps, currentIndex: 2, look, allowJumpBack: true } })
			const focusable = [...wrapper.element.querySelectorAll('button')]
			expect(focusable).toHaveLength(2)
			expect(focusable.map((b) => b.querySelector('.cn-stepper__label').textContent + b.querySelector('.cn-stepper__sr').textContent)).toEqual(['Audience, completed', 'Course, completed'])
			expect(wrapper.element.querySelector('[aria-current="step"] button')).toBeNull()
		})

		it('holds no focusable element without allowJumpBack', () => {
			wrapper = mountAttached(CnStepper, { propsData: { steps, currentIndex: 2, look, allowJumpBack: false } })
			expect(wrapper.element.querySelectorAll('button, a[href], [tabindex]')).toHaveLength(0)
		})
	})

	it('CnFormErrorSummary has no WCAG 2.1 AA violations', async () => {
		wrapper = mountAttached(CnFormErrorSummary, {
			propsData: { errors: [{ key: 'a', message: 'Name is required', controlId: 'x' }, { key: 'b', message: 'Email is not valid', controlId: 'y' }] },
		})
		await expectAccessible(wrapper)
	})

	it('CnFormField head has no WCAG 2.1 AA violations with an error', async () => {
		wrapper = mountAttached({
			components: { CnFormField },
			template: '<div><CnFormField controlId="f" text="Email" :optional="true" error="Email is not valid" errorId="e" /><input id="f" aria-describedby="e" aria-invalid="true"></div>',
		})
		await expectAccessible(wrapper)
	})
})
