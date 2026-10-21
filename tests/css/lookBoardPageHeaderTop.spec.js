/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a page's header starts 4px under the content's top and
 * its title sits at the top of the title row, beside the buttons, so the
 * title is at 96 and the line under it at 142 (DqZaken, DqMijnWerk, DqZaak).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-page-header-top/specs/board-page-header-top/spec.md#requirement-a-board-page-title-sits-4px-under-the-content-top
 */
const fs = require('fs')
const path = require('path')

/**
 * A stylesheet's text without its comments.
 *
 * @param {string} name The file under src/css.
 * @return {string} The text.
 */
function sheet(name) {
	return fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * The bodies of every rule that lists exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The bodies, joined.
 */
function bodiesOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('board page header: 4px under the content top, the title at the row top', () => {
	const board = sheet('look-board.css')
	const index = sheet('look-board-index.css')

	it('insets the index header 4px and aligns its row to the top', () => {
		const body = bodiesOf(index, '.cn-look-board .cn-index-page .cn-page-header')
		expect(body).toContain('padding-top: 4px;')
		expect(body).toContain('align-items: start;')
	})

	it.each([
		'.cn-look-board .cn-detail-page:not(.cn-look-nextcloud *) .cn-detail-page__header',
		'.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__header',
	])('insets %s 4px', (selector) => {
		expect(bodiesOf(board, selector)).toContain('padding-top: 4px;')
	})

	it('puts the dashboard title at the top of its row', () => {
		const body = bodiesOf(board, '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__title-row')
		expect(body).toContain('align-self: start;')
		expect(body).not.toContain('align-self: center;')
	})
})
