/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The links page in the board look, as PqGeavanceerdHub draws it. Read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-link-cards-page/specs/board-link-cards-page/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const PAGE = '.cn-look-board .cn-link-cards-page:not(.cn-look-nextcloud *)'

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: links page', () => {
	it('lays the cards in columns of at least 320px, 16px apart', () => {
		expect(body(`${PAGE} .cn-link-cards-page__grid`)).toMatch(/grid-template-columns: repeat\(auto-fill, minmax\(320px, 1fr\)\);/)
		expect(body(`${PAGE} .cn-link-cards-page__grid`)).toMatch(/gap: 16px;/)
	})

	it('draws a card with the hairline, 18px padding and a 40px icon tile at its top', () => {
		expect(body(`${PAGE} .cn-link-cards-page__card`)).toMatch(/border-color: var\(--cn-board-hairline\);/)
		expect(body(`${PAGE} .cn-link-cards-page__card`)).toMatch(/padding: 18px;/)
		expect(body(`${PAGE} .cn-link-cards-page__icon`)).toMatch(/width: 40px;/)
		expect(body(`${PAGE} .cn-link-cards-page__icon`)).toMatch(/align-self: flex-start;/)
	})

	it('draws the status pill at the normal line height, 21px tall', () => {
		expect(body(`${PAGE} .cn-link-cards-page__status`)).toMatch(/line-height: normal;/)
	})

	it('titles the page at 28px/700 with no gap for the navigation toggle', () => {
		expect(body(`${PAGE} .cn-link-cards-page__title`)).toMatch(/font-size: 28px;/)
		expect(body(`${PAGE} .cn-link-cards-page__header`)).toMatch(/padding: 4px 0 8px;/)
	})
})
