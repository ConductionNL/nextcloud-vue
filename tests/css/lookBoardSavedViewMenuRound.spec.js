/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view row's menu trigger ("Beheer Termijn deze week") is a round
 * 34px button on the boards (DqFilterBeheren, DqFilterInMenu); NcActions drew
 * it with the 8px element radius. jsdom draws no layout, so the rule is read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-saved-view-menu-round/specs/board-saved-view-menu-round/spec.md#requirement-a-saved-view-rows-menu-trigger-is-round
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-index.css: saved view menu trigger', () => {
	it('draws it round', () => {
		const body = ruleFor('.cn-look-board .cn-saved-views-panel__row .action-item__menutoggle:not(.cn-look-nextcloud *)')
		expect(body).not.toBeNull()
		expect(body).toContain('border-radius: 17px;')
	})
})
