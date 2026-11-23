/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqStore: Install and Update are the tonal card pill, and the chosen
 * lens chip has no edge. NcButton redefines the primary light colour inside
 * the button, so the pill reads the tint the body hands down.
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/store-card-tonal-action/specs/store-page/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-index.css: store card pills', () => {
	it('draws Install and Update in the tint the body hands down', () => {
		const soft = rulesFor('.cn-look-board .cn-store-page__card--board .cn-store-page__card-action--soft.button-vue')
		expect(soft).toMatch(/background-color: var\(--cn-tonal-bg/)
		expect(soft).toMatch(/color: var\(--cn-tonal-ink/)
		const text = rulesFor('.cn-look-board .cn-store-page__card--board .cn-store-page__card-action--soft.button-vue .button-vue__text')
		expect(text).toMatch(/color: var\(--cn-tonal-ink/)
	})

	it('draws the chosen lens chip without an edge', () => {
		expect(rulesFor('.cn-look-board .cn-store-page__lenses > .cn-store-page__lens--active')).toMatch(/border-width: 0/)
	})
})
