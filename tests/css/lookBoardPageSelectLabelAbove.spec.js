/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A labelled select in a board page card carries its label above the control
 * at 14px/600, the control 40px with 21px of room above it, as the boards draw
 * every labelled select (19 of 19 on the Dq boards) and as board dialogs
 * already do (DqZaakEmail "E-mailsjabloon", r30). Read from the stylesheet.
 *
 * @spec openspec/changes/board-page-select-label-above/specs/board-page-select-label-above/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const SELECT = '.cn-look-board .cn-detail-widget-host .v-select:not(.cn-quick-filter-bar__select):has(.input-field__label):not(.cn-look-nextcloud *)'
const LABEL = '.cn-look-board .cn-detail-widget-host .v-select:not(.cn-quick-filter-bar__select) .input-field__input + .input-field__label.input-field__label:not(.cn-look-nextcloud *)'

describe('look-board-detail.css: a labelled select in a page card', () => {
	it('makes 21px of room above the control and sets the theme label weight to 600', () => {
		expect(bodyOf(SELECT)).toMatch(/margin-block:\s*21px 0/)
		expect(bodyOf(SELECT)).toMatch(/--nldesign-component-form-field-label-font-weight:\s*600/)
	})

	it('raises the label above the control at 14px/600 on the normal line', () => {
		const label = bodyOf(LABEL)
		expect(label).toMatch(/inset-block-end:\s*calc\(100% \+ 4px\)/)
		expect(label).toMatch(/font-weight:\s*600/)
		expect(label).toMatch(/line-height:\s*normal/)
	})
})
