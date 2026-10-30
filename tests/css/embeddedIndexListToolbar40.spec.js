/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqEvenement "Aanmeldingen": the index list inside a record card draws
 * its toolbar controls 40px tall (Filter), where a list page keeps the 36px
 * Filter of the Dq index boards.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'css', 'look-board-index.css'), 'utf8')

describe('embedded index list toolbar', () => {
	const rule = /\.cn-look-board \.cn-index-list-widget \.cn-actions-bar__filter-button\.button-vue,\s*\.cn-look-board \.cn-index-list-widget \.cn-actions-bar__filter-menu \.button-vue \{([^}]*)\}/

	it('🔴 draws the Filter control 40px tall inside a record card', () => {
		const body = (css.match(rule) || [])[1] || ''
		expect(body).toMatch(/--button-size: 40px;/)
		expect(body).toMatch(/min-height: 40px;/)
		expect(body).toMatch(/\bheight: 40px;/)
	})

	it('comes after the list page\'s 36px Filter, so it wins at the same order', () => {
		const page = css.indexOf('.cn-look-board .cn-actions-bar__filter-button.button-vue,')
		const embedded = css.search(rule)
		expect(page).toBeGreaterThan(-1)
		expect(embedded).toBeGreaterThan(page)
	})
})
