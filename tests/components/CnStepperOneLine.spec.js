import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board stepper keeps all steps on one row (DqInstellen).
 *
 * @spec openspec/changes/board-stepper-one-line/specs/wizard-dialog/spec.md
 */
import fs from 'fs'
import path from 'path'
import CnStepper from '../../src/components/CnStepper/CnStepper.vue'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnStepper/CnStepper.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The exact selector of the rule.
 * @return {string} The rule's body.
 */
function rule(selector) {
	const at = sfc.indexOf(selector + ' {')
	return at < 0 ? '' : sfc.slice(at, sfc.indexOf('}', at))
}

describe('CnStepper board look on one line', () => {
	it('does not wrap the row and lets the labels truncate', () => {
		expect(rule('.cn-stepper--board')).toContain('flex-wrap: nowrap')
		expect(rule('.cn-stepper--board .cn-stepper__item')).toContain('min-width: 0')
		expect(rule('.cn-stepper--board .cn-stepper__label')).toContain('text-overflow: ellipsis')
	})

	it('still draws every step with its full label', () => {
		const steps = ['Welkom', 'Organisatie', 'Teams', 'Zaaktypen', 'Rechten', 'Klaar'].map((label, i) => ({ id: 's' + i, label }))
		const w = mount(CnStepper, { props: { steps, currentIndex: 2, look: 'board' } })
		expect(w.find('ol').classes()).toContain('cn-stepper--board')
		expect(w.findAll('.cn-stepper__label').map((l) => l.text())).toEqual(steps.map((s) => s.label))
	})
})
