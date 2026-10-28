/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqModules: the module cards and the list cards set their titles,
 * the pages line and the page links on the normal line, and the Open button
 * is never underlined. Read as text.
 *
 * @spec openspec/changes/module-card-normal-leading/specs/link-cards-page/spec.md
 */
const fs = require('fs')
const path = require('path')

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const card = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnModuleCard/CnModuleCard.vue'), 'utf8'))
const page = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue'), 'utf8'))

/**
 * @param {string} css The stylesheet.
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(css, selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('the module cards on a links page (PqModules)', () => {
	it('sets the title on the normal line, 20.4px at 17px as the board', () => {
		expect(body(card, '.cn-module-card__title')).toContain('line-height: normal;')
	})

	it('sets the pages line and the page links on the normal line', () => {
		expect(body(card, '.cn-module-card__pages-line')).toContain('line-height: normal;')
		expect(body(card, '.cn-module-card__pages')).toContain('line-height: normal;')
	})

	it('never underlines the Open button, also under a theme that underlines links', () => {
		expect(card).toMatch(/\.cn-module-card__open:hover,[\s\S]*?text-decoration: none !important;/)
	})
})

describe('the list cards on a links page (PqModules "Ook in Pipelinq", "Meer")', () => {
	it('sets the card title on the normal line', () => {
		expect(body(page, '.cn-link-cards-page__group--list .cn-link-cards-page__caption')).toContain('line-height: normal;')
	})
})
