/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record pager in the board look (DqZaak and the other case boards): two
 * 40px squares with a border on the board's radius, the position between them
 * at 14px, the disabled end in the line colour. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The rule's selector up to its brace.
 * @return {string} The rule's body.
 */
function rule(selector) {
	const start = css.indexOf(`${selector} {`)
	expect(start).toBeGreaterThan(-1)
	return css.slice(start, css.indexOf('}', start))
}

describe('look-board-detail.css: the case pager', () => {
	it('draws previous and next as bordered 40px squares', () => {
		const body = rule('.cn-look-board .cn-detail-page__header-actions .cn-detail-page__list-nav .button-vue')
		expect(body).toContain('inline-size: var(--cn-board-control-height)')
		expect(body).toContain('border: 1px solid var(--color-border-maxcontrast)')
		expect(body).toContain('border-radius: var(--cn-board-control-radius)')
	})

	it('greys the end that cannot step further', () => {
		expect(rule('.cn-look-board .cn-detail-page__header-actions .cn-detail-page__list-nav .button-vue:disabled')).toContain('border-color: var(--color-border)')
	})

	it('writes the position at 14px between them', () => {
		const body = rule('.cn-look-board .cn-detail-page__list-nav-position')
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('min-width: 68px')
	})
})
