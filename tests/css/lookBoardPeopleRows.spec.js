/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a people widget in a widget card has no padding of its
 * own, and its list layout is the boards' ruled list rows (launchpad
 * LpVandaag, LpIntranet). Read from the stylesheet.
 *
 * @spec openspec/specs/people-widget/spec.md#requirement-a-board-people-list-is-ruled-rows
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the first rule whose selector contains every part.
 *
 * @param {string[]} parts Selector fragments.
 * @return {string|null} The declaration block.
 */
function rule(parts) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (parts.every((part) => m[1].includes(part))) {
			return m[2]
		}
	}
	return null
}

describe('look-board: people list rows', () => {
	it('drops the widget\'s own padding inside a widget card', () => {
		expect(rule(['.cn-look-board .cn-widget-wrapper__content', '.cn-people-widget '])).toMatch(/padding:\s*0/)
	})

	it('rules every row with the board hairline, 10px above and below', () => {
		const block = rule(['.cn-people-widget--list', '.cn-people-widget__item '])
		expect(block).toMatch(/padding:\s*10px 0/)
		expect(block).toMatch(/border-top:\s*1px solid var\(--cn-board-hairline\)/)
		expect(block).toMatch(/border-radius:\s*0/)
	})

	it('sets the name 15px bold and the lines 13px', () => {
		expect(rule(['.cn-people-widget--list', '.cn-people-widget__name'])).toMatch(/font-size:\s*15px/)
		expect(rule(['.cn-people-widget--list', '.cn-people-widget__sub'])).toMatch(/font-size:\s*13px/)
	})
})
