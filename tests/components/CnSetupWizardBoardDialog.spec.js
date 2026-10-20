/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The setup wizard in the board look (board DqInstellen): 20px between the
 * stepper and the step, and no second heading over a choice whose title is
 * already the dialog's heading (the legend stays for assistive tech).
 *
 * @spec openspec/changes/board-setup-wizard/specs/board-setup-wizard/spec.md#requirement-the-board-setup-wizard-reads-as-the-board-draws-it
 */
const fs = require('fs')
const path = require('path')

function styleOf(file) {
	const sfc = fs.readFileSync(path.join(__dirname, '../../src/components', file), 'utf8')
	return sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('the board setup wizard', () => {
	it('leaves 20px under the board stepper', () => {
		expect(styleOf('CnStepper/CnStepper.vue')).toMatch(/\.cn-stepper--board\s*\{[^}]*margin: 0 0 20px;/)
	})

	it('keeps a titled choice legend for assistive tech only', () => {
		const css = styleOf('CnSetupWizard/CnSetupWizard.vue')
		expect(css).toMatch(/\.cn-setup-step__choices--titled :deep\(\.cn-choice-cards__legend\)\s*\{[^}]*clip-path: inset\(50%\);/)
		const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnSetupWizard/CnSetupWizard.vue'), 'utf8')
		expect(sfc).toContain(":class=\"{ 'cn-setup-step__choices--titled': isBoard }\"")
	})
})
