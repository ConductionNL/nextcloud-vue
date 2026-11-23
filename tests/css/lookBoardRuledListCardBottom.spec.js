/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a dashboard card that lists ruled rows (a record list
 * that rules above its rows, a task list) ends 20px under its last row, the
 * card's own padding, as the Dq boards draw it: the 10px it had left
 * DqMijnTeam "Wachtrij van uw team" 242 against 249 and DqMijnWerk "Mijn
 * taken" and "Verder werken" 10px short (r34). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const card = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-widget-wrapper__content'

describe('look-board.css: a card of ruled rows ends 20px under its last row', () => {
	it('pads a ruled record list 20px at the bottom', () => {
		expect(rulesFor(card + ' > .cn-record-list.cn-record-list--rule-above')).toContain('padding-bottom: 20px')
	})

	it('pads a task list 20px at the bottom', () => {
		expect(rulesFor(card + ' > .cn-tasks-widget.cn-tasks-widget--list')).toContain('padding-bottom: 20px')
	})
})
