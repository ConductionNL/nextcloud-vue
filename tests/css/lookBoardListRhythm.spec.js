/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Dq list boards stack header, toolbar, bulk band and card 20px apart,
 * the header ending 8px under a count line at its normal leading, and the
 * map card as tall as its 533px map (DqZaken, DqWerkbord, DqZakenKaart).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-list-rhythm/specs/board-list-rhythm/spec.md#requirement-a-board-list-page-keeps-the-boards-vertical-rhythm
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the last rule whose selector list ends with the given selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleEndingWith(selector) {
	const at = css.lastIndexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: list page rhythm', () => {
	it('ends a header without a breadcrumb row 8px under the count line', () => {
		expect(ruleEndingWith('.cn-look-board .cn-index-page .cn-page-header:not(:has(.cn-header-trail))')).toMatch(/padding-bottom: 8px;/)
	})

	it('sets the count line at its normal leading, also under a theme', () => {
		const rule = ruleEndingWith('.cn-look-board .cn-index-page .cn-page-header .cn-page-header__description')
		expect(rule).toMatch(/--nldesign-component-paragraph-line-height: normal;/)
		expect(rule).toMatch(/\tline-height: normal;/)
	})

	it('gives the bulk band no margin of its own in the index page', () => {
		expect(ruleEndingWith('.cn-look-board .cn-index-page:not(.cn-look-nextcloud *) > .cn-actions-bar__band')).toMatch(/margin-bottom: 0;/)
	})

	it('keeps the map card at its content height with a 533px map', () => {
		expect(ruleEndingWith('.cn-look-board .cn-index-page__main.cn-index-page__main--map')).toMatch(/align-self: flex-start;/)
		const card = ruleEndingWith('.cn-look-board .cn-index-page__main--map > .cn-index-page__map-card')
		expect(card).toMatch(/flex: none;/)
		expect(card).toMatch(/padding: 18px;/)
		expect(ruleEndingWith('.cn-look-board .cn-index-page__map-card .cn-index-page__map:not(.cn-look-nextcloud *)')).toMatch(/min-height: 533px;/)
	})

	it('sets the map list number line and date at their normal leading', () => {
		expect(ruleEndingWith('.cn-look-board .cn-index-page__map-due')).toMatch(/line-height: normal;/)
	})
})
