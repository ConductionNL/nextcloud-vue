/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a grouped-cards group title and card title sit at 1.2
 * (15px on 18, DqZaaktype phases and tasks; r29 read 22.5), and the buttons
 * above the groups are the card's 34px controls (r29 read 40). Read from the
 * stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector is written exactly so.
 *
 * @param {string} selector The selector.
 * @return {string} The rule from its selector to its closing brace.
 */
function rule(selector) {
	const at = css.indexOf(`${selector} {`)
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: grouped cards', () => {
	it('sets the group title at line height 1.2', () => {
		expect(rule('.cn-look-board .cn-grouped-cards__group-title.cn-grouped-cards__group-title')).toContain('line-height: 1.2;')
	})

	it('sets the card title at line height 1.2', () => {
		expect(rule('.cn-look-board .cn-grouped-cards__item-title.cn-grouped-cards__item-title')).toContain('line-height: 1.2;')
	})

	it('draws the buttons above the groups 34px tall', () => {
		const body = rule('.cn-look-board .cn-grouped-cards__actions:not(.cn-look-nextcloud *) .button-vue')
		expect(body).toContain('min-height: 34px;')
		expect(body).toContain('height: 34px;')
	})
})

describe('look-board-detail.css: grouped cards toolbar spacing', () => {
	it('sets the buttons 14px above the groups, nothing added above them', () => {
		const at = css.indexOf('.cn-look-board .cn-grouped-cards__actions.cn-grouped-cards__actions:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('margin-block: 0 14px;')
	})
})
