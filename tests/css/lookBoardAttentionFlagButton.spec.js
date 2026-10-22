/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The case boards draw the attention flag's "Markeer voor aandacht" as a 40px
 * button (DqZaak and the case tab boards, 14 boards); NcButton draws 34px.
 * jsdom draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-attention-flag-button-height/specs/board-attention-flag-button-height/spec.md#requirement-the-attention-flags-buttons-are-40px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board-detail.css: attention flag buttons', () => {
	it('draws a labelled button 40px tall', () => {
		const body = ruleFor('.cn-look-board .cn-attention-flag:not(.cn-look-nextcloud *) .button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty))')
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
	})
})
