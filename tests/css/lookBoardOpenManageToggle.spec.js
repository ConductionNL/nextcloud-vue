/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view's manage toggle stays clear while its menu is open: the row's
 * primary tint shows through it (DqFilterBeheren "Beheer Wacht op inwoner",
 * DqFilterInMenu "Beheer Termijn deze week"). jsdom draws no layout, so the
 * rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-open-manage-toggle-clear/specs/board-open-manage-toggle-clear/spec.md
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

describe('look-board-index.css: an open manage toggle', () => {
	it('keeps no background of its own, over NcActions\' open background', () => {
		const rule = ruleFor('.cn-look-board .cn-saved-views-panel__row .action-item--open .action-item__menutoggle:not(.cn-look-nextcloud *)')
		expect(rule).toContain('background-color: transparent;')
	})
})
