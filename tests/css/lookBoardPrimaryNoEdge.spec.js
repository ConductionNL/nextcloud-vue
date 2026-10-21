/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a primary NcButton draws no edge: the boards draw a
 * primary as its fill alone (DqZaak "Volgende stap", DqOverdragen
 * "Overdragen", DqBerichtVersturen "Versturen"), where NcButton gives every
 * button a 1px border. jsdom draws no layout, so the rule is read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-primary-no-edge/specs/board-primary-no-edge/spec.md#requirement-a-board-primary-button-draws-no-edge
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board.css: primary button', () => {
	const guard = ':where(:not(.cn-look-nextcloud *):not(.vue-crumb *))'

	it.each(['button-vue--primary', 'button-vue--vue-primary'])('draws a %s without an edge', (variant) => {
		const body = ruleFor(`.cn-look-board .button-vue.${variant}${guard}`)
		expect(body).not.toBeNull()
		expect(body).toContain('border: 0;')
	})
})
