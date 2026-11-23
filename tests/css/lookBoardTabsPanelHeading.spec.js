/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A CnTabsWidget panel heading (DqZaaktypeRegels "Regels op de zaak"): the
 * heading text only takes its 260px flex basis in the actions row, and the
 * board look sets title and subtitle on their natural leading 2px apart with
 * the card's 12px gap before the content. jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const boardCss = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8'))
const vue = fs.readFileSync(path.join(__dirname, '../../src/components/CnTabsWidget/CnTabsWidget.vue'), 'utf8')
const scopedCss = strip(vue.slice(vue.indexOf('<style scoped>')))

/**
 * The bodies of every rule in `css` that lists exactly this selector, joined.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('CnTabsWidget panel heading', () => {
	it('gives the heading text its 260px basis only in the actions row', () => {
		expect(bodiesOf(scopedCss, '.cn-tabs-widget__panel-heading-text')).not.toContain('flex: 1 1 260px')
		expect(bodiesOf(scopedCss, '.cn-tabs-widget__panel-heading--actions > .cn-tabs-widget__panel-heading-text')).toContain('flex: 1 1 260px;')
	})

	it('sets the board look heading as the board draws it', () => {
		expect(bodiesOf(boardCss, '.cn-look-board .cn-tabs-widget__tabs .cn-tabs-widget__panel-heading')).toContain('margin-bottom: 12px;')
		expect(bodiesOf(boardCss, '.cn-look-board .cn-tabs-widget__tabs .cn-tabs-widget__panel-heading--actions')).toContain('row-gap: 8px;')
		expect(bodiesOf(boardCss, '.cn-look-board .cn-tabs-widget__tabs .cn-tabs-widget__panel-heading-text')).toContain('gap: 2px;')
		expect(bodiesOf(boardCss, '.cn-look-board .cn-tabs-widget__tabs .cn-tabs-widget__panel-title')).toContain('line-height: normal;')
		expect(bodiesOf(boardCss, '.cn-look-board .cn-tabs-widget__tabs .cn-tabs-widget__panel-subtitle')).toContain('line-height: normal;')
	})
})
