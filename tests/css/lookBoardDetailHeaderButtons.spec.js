/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The detail page header draws the board's neutral 40px buttons (DqZaak:
 * Bericht, Document, Contact vastleggen, Bewerken, Meer): the main
 * background, a grey border, the main text at 600, also under a theme that
 * styles every secondary button with `!important` (a primary outline).
 * jsdom draws no layout, so the values are read from the stylesheet.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} needle The end of a selector.
 * @return {string} The declarations of every rule with a selector ending in it.
 */
function rulesEndingWith(needle) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).some((s) => s.endsWith(needle))) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-detail.css: header buttons', () => {
	it('draws the quick actions, Edit and the Meer menu neutral, outranking a theme', () => {
		for (const needle of ['.cn-detail-page__header-actions > .button-vue--secondary', '.cn-detail-page__header-actions .action-item--secondary .action-item__menutoggle']) {
			const body = rulesEndingWith(needle)
			expect(body).toMatch(/border:\s*1px solid var\(--color-border-dark\) !important/)
			expect(body).toMatch(/background:\s*var\(--color-main-background\) !important/)
			expect(body).toMatch(/color:\s*var\(--color-main-text\) !important/)
			expect(body).toMatch(/padding:\s*0 14px !important/)
			expect(body).toMatch(/font-weight:\s*600 !important/)
			expect(body).not.toMatch(/--color-primary-element/)
		}
	})

	it('draws a 16px icon 8px before the label', () => {
		const body = rulesEndingWith('.cn-detail-page__header-actions > .button-vue--secondary .button-vue__icon')
		expect(body).toMatch(/width:\s*16px/)
		expect(body).toMatch(/margin-inline-end:\s*8px/)
	})
})
