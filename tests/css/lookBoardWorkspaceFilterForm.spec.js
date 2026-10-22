/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a workspace filter form's field and load button 40px tall,
 * the button 16px in at both sides (DqTermijnen "Jaar" with "Rapport laden",
 * "Kwartaal" with "Audit laden"); the form drew 34px, 12px in. jsdom draws no
 * layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-workspace-filter-form/specs/board-workspace-filter-form/spec.md#requirement-a-board-workspace-filter-forms-controls-are-40px
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

const FORM = '.cn-look-board .cn-workspace-filter-widget__form:not(.cn-look-nextcloud *)'

describe('look-board.css: workspace filter form', () => {
	it('draws the field 40px tall', () => {
		expect(ruleFor(`${FORM} .cn-workspace-filter-widget__input`)).toContain('min-height: var(--cn-board-control-height);')
	})

	it('draws the load button 40px tall, 16px in', () => {
		const body = ruleFor(`${FORM} .button-vue`)
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
		expect(body).toContain('--button-padding: 16px;')
		expect(ruleFor(`${FORM} .button-vue .button-vue__text.button-vue__text`)).toContain('padding-inline: 0;')
	})
})
