/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view's manage menu ("Beheer Termijn deze week") is the boards'
 * 264px menu with 40px rows, 600 labels, 12px explanations and a red Delete
 * (DqFilterBeheren, DqFilterInMenu). jsdom draws no layout, so the rules are
 * read from the stylesheet text.
 *
 * @spec openspec/changes/board-saved-view-manage-menu/specs/board-saved-view-manage-menu/spec.md#requirement-a-saved-views-manage-menu-is-the-boards-menu
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

const MENU = 'body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .v-popper__popper.action-item__popper'

describe('look-board.css: saved view manage menu', () => {
	it('is 264px wide', () => {
		expect(ruleFor(`${MENU}:has(li[data-testid^="cn-saved-views-"]) .v-popper__wrapper .v-popper__inner`)).toContain('width: 264px;')
	})

	it('draws 40px rows with the label at 600', () => {
		const body = ruleFor(`${MENU} li.action[data-testid^="cn-saved-views-"] > .action-button`)
		expect(body).toContain('min-height: 40px;')
		expect(body).toContain('padding: 6px 10px;')
		expect(body).toContain('gap: 12px;')
		expect(body).toContain('font-weight: 600;')
	})

	it('draws the explanation in 12px at 400', () => {
		const body = ruleFor(`${MENU} li.action[data-testid^="cn-saved-views-"] .action-button__description`)
		expect(body).toContain('font-size: 12px;')
		expect(body).toContain('font-weight: 400;')
	})

	it('draws Delete in the error red', () => {
		expect(ruleFor(`${MENU} li.action[data-testid="cn-saved-views-delete"] > .action-button`)).toContain('color: var(--color-error-text);')
	})
})
