/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqInspectie r34: the photo button fills its card's width (272px drawn,
 * 214.8 live) without a margin of its own, and Previous and Next are as wide
 * as drawn (Vorige 70.3, live 74.3; their gap 144.5, live 136.5).
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'), 'utf8')
const css = sfc.replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('CnChecklistRunWidget r34', () => {
	it('stretches the photo button over its card, 34px high, no margin', () => {
		const button = rule('.cn-checklist-run__photo-button.cn-checklist-run__photo-button')
		expect(button).toContain('align-self: stretch')
		expect(button).toContain('margin: 0')
		expect(button).toContain('height: 34px')
	})

	it('sets Previous and Next labels without inner padding', () => {
		expect(rule('.cn-checklist-run__nav :deep(.button-vue__text)')).toContain('padding-inline: 0')
	})
})
