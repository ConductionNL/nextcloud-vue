/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A linked row lifts its controls above the row link with `position:
 * relative`. NcCheckboxRadioSwitch's own input is hidden behind its icon with
 * `position: absolute`; lifting it put the 34px input back in the flow and
 * every linked row grew to 69px where the boards draw 66 (DqZaaktypen,
 * measured on :8080). The selection cell itself is already lifted.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/table.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('table.css: a linked row and the checkbox switch input', () => {
	const rule = css.match(/([^{}]*\.cn-table-row--linked td :is\([^{}]*)\{([^{}]*)\}/)

	it('lifts the row controls above the link', () => {
		expect(rule).not.toBeNull()
		expect(rule[2]).toMatch(/position:\s*relative/)
	})

	it('leaves the checkbox switch input where the switch put it', () => {
		const selectors = rule[1].split(/,(?![^(]*\))/).map((s) => s.trim()).filter((s) => s.includes(':is('))
		expect(selectors.length).toBeGreaterThan(0)
		selectors.forEach((selector) => expect(selector).toContain(':not(.checkbox-radio-switch__input)'))
	})
})
