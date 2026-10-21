/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page's page tabs are folder tabs, never prose links: a theme that
 * underlines every `<a>` in the link colour (the nldesign theme) is handed
 * the tab's own ink and no underline, and in the board look the strip draws
 * DqContracten's folder tabs: no rule under the strip, 400 inactive and 700
 * open, the count in the boards' grey pill. jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const base = read('index-page.css')
const board = read('look-board-index.css')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const BOARD = '.cn-look-board .cn-index-page:not(.cn-look-nextcloud *)'

describe('index page tabs under a theme', () => {
	it('hands the theme\'s link tokens the tab ink and no underline', () => {
		const body = bodyOf(base, '.cn-index-page__page-tab')
		expect(body).toContain('--nldesign-component-link-text-decoration: none;')
		expect(body).toContain('--nldesign-component-link-color: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-hover-color: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-visited-color: var(--color-main-text);')
		expect(body).toContain('--nldesign-color-on-surface: var(--color-main-text);')
	})
})

describe('look-board-index.css: page tabs are the boards\' folder tabs', () => {
	it('draws no rule under the strip', () => {
		expect(bodyOf(board, `${BOARD} .cn-index-page__page-tabs`)).toContain('border-bottom: none;')
	})

	it('sets an inactive tab at 14px and 400, the open one at 700', () => {
		const tab = bodyOf(board, `${BOARD} .cn-index-page__page-tab`)
		expect(tab).toContain('font-size: 14px;')
		expect(tab).toContain('font-weight: 400;')
		expect(bodyOf(board, `${BOARD} .cn-index-page__page-tab--active`)).toContain('font-weight: 700;')
	})

	it('draws the count in the boards\' grey pill', () => {
		const pill = bodyOf(board, `${BOARD} .cn-index-page__page-tab-count`)
		expect(pill).toContain('background: var(--color-border);')
		expect(pill).toContain('color: var(--cn-board-text-soft);')
	})

	it('lets the list card keep its height when the notice sits under it', () => {
		expect(bodyOf(board, `${BOARD} .cn-index-page__body--before-notice`)).toContain('flex: 0 1 auto;')
	})
})
