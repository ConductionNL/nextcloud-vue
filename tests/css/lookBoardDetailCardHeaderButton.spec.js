/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A labelled button beside a CnDetailCard's title is 40px, as beside a
 * widget card's title (DqTaak "Notitie toevoegen" on the notes card). Menu
 * triggers and icon-only buttons keep their size. jsdom draws no layout, so
 * the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-detail-card-header-button-height/specs/board-detail-card-header-button-height/spec.md#requirement-a-labelled-detail-card-header-button-is-40px
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

describe('look-board.css: detail card header button', () => {
	it('draws a labelled button beside the title at the control height', () => {
		const body = ruleFor('.cn-look-board .cn-detail-card__header-right .button-vue:not(.action-item__menutoggle):has(> .button-vue__wrapper > .button-vue__text:not(:empty)):where(:not(.cn-look-nextcloud *))')
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
	})
})
