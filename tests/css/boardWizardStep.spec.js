/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board setup wizard (DqInstellen): a step's parts 16px apart, a white
 * check on a done step, done labels in the main text. Read as text.
 *
 * @spec openspec/changes/board-wizard-step/specs/setup-wizard/spec.md
 */
const fs = require('fs')
const path = require('path')

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const dialog = strip(fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8'))
const stepper = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnStepper/CnStepper.vue'), 'utf8'))

/**
 * @param {string} css The stylesheet.
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(css, selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('the board setup wizard', () => {
	it('sets a step\'s parts 16px apart and drops the note margin', () => {
		expect(body(dialog, '.cn-dialog-board .cn-wizard-dialog__step-body .cn-setup-step')).toContain('gap: 16px;')
		expect(body(dialog, '.cn-dialog-board .cn-wizard-dialog__step-body .cn-setup-step .notecard.notecard')).toContain('margin: 0;')
	})

	it('draws a done step with a white check and a main-text label', () => {
		expect(body(stepper, '.cn-stepper--board .cn-stepper__item--done .cn-stepper__dot')).toContain('color: var(--color-primary-element-text, #fff);')
		expect(body(stepper, '.cn-stepper--board .cn-stepper__item--done .cn-stepper__label')).toContain('color: var(--color-main-text);')
		expect(body(stepper, '.cn-stepper--board .cn-stepper__item--upcoming .cn-stepper__dot')).toContain('font-weight: 700;')
	})
})
