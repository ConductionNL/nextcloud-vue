/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The grouped cards widget in the board look, against DqZaaktype "Fasen en
 * taken": groups 14px apart, a group padded 14px with a 10px radius and a bold
 * title, a card padded 9px 12px with an 8px radius and a 15px title. Read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-grouped-cards/specs/board-grouped-cards/spec.md#requirement-board-grouped-cards-take-the-boards-group-and-card-shape
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: grouped cards', () => {
	it('sets the groups 14px apart', () => {
		expect(rule('.cn-look-board .cn-grouped-cards__grid.cn-grouped-cards__grid')).toContain('gap: 14px')
	})

	it('pads a group 14px with a 10px radius and titles it bold', () => {
		const group = rule('.cn-look-board .cn-grouped-cards__group.cn-grouped-cards__group')
		expect(group).toContain('padding: 14px')
		expect(group).toContain('border-radius: 10px')
		expect(rule('.cn-look-board .cn-grouped-cards__group-title.cn-grouped-cards__group-title')).toContain('font-weight: 700')
	})

	it('pads a card 9px 12px with the 8px control radius and a 15px title', () => {
		const item = rule('.cn-look-board .cn-grouped-cards__item.cn-grouped-cards__item')
		expect(item).toContain('padding: 9px 12px')
		expect(item).toContain('border-radius: var(--cn-board-control-radius, 8px)')
		expect(rule('.cn-look-board .cn-grouped-cards__item-title.cn-grouped-cards__item-title')).toContain('font-size: 15px')
	})

	it('only reaches the board look', () => {
		for (const s of css.match(/[^{}]*cn-grouped-cards[^{}]*\{/g) || []) {
			expect(s.trim().startsWith('.cn-look-board ')).toBe(true)
		}
	})
})
