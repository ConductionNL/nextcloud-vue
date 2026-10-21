/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a CnTabsWidget panel is the card under the open tab, so
 * it is padded as a board card, 20px 22px (DqZaakHistorie), and a list's
 * footer Add bleeds that padding. A panel that holds a stack keeps no
 * padding: each widget there is its own card. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const tokens = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const panel = '.cn-look-board .cn-tabs--board.cn-tabs-widget__tabs .cn-tabs__content'

describe('look-board-detail.css: the board tab panel', () => {
	it('pads the panel as a board card', () => {
		expect(rulesFor(panel)).toContain('padding: var(--cn-board-card-padding)')
		expect(tokens).toContain('--cn-board-card-padding: 20px 22px')
	})

	it('lets a list\'s footer Add bleed the card padding', () => {
		expect(rulesFor(`${panel} > .cn-tab > .cn-detail-widget-host--bare .cn-object-list-widget__add`)).toContain('margin: auto -22px -20px')
	})

	it('keeps a stack panel unpadded', () => {
		expect(rulesFor(`${panel}:has(> .cn-tab:not([hidden]) > .cn-tabs-widget__stack)`)).toContain('padding: 0')
	})
})
