/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The chat's send button keeps its primary look and the labelled one its
 * 40px/14px against server.css, which styles every button at (0,2,1)
 * (DqZaakAssistent "Vragen" read grey, 36px, 15px).
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/components/CnAiCompanion/CnAiInput.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnAiInput send button', () => {
	it('outranks server.css with a doubled class', () => {
		expect(rule('button.cn-ai-input__send-button.cn-ai-input__send-button')).toContain('background: var(--color-primary-element)')
		const labelled = rule('button.cn-ai-input__send-button--labelled.cn-ai-input__send-button--labelled')
		expect(labelled).toContain('height: 40px')
		expect(labelled).toContain('font-size: 14px')
		expect(labelled).toContain('font-weight: 600')
	})

	it('keeps the labelled button\'s 14px sides against server.css (DqZaakAssistent "Vragen" 71.5 wide, live 67.5)', () => {
		expect(rule('button.cn-ai-input__send-button--labelled.cn-ai-input__send-button--labelled')).toContain('padding: 0 14px')
	})
})
