/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a folder tab draws the widget card's border, so the strip
 * and the card it opens onto meet in one line. jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-tabs-widget-border/specs/board-tabs-widget-border/spec.md#requirement-board-folder-tabs-draw-the-widget-card-border
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const TAB = '.cn-look-board .cn-tabs--board .cn-tabs__nav-item'
const CARD = '.cn-look-board .cn-detail-page .cn-widget-wrapper'

describe('look-board-detail.css: folder tabs share the widget card border', () => {
	it('draws the card in the border token the tabs use', () => {
		expect(bodyOf(CARD)).toContain('border: 1px solid var(--color-border);')
	})

	it('draws a tab\'s outline in the card border token', () => {
		expect(bodyOf(TAB)).toContain('border: 1px solid var(--color-border);')
	})

	it('draws the open tab\'s top edge in the card border token', () => {
		expect(bodyOf(`${TAB}.cn-tabs__nav-item--active`)).toContain('border-top: 1px solid var(--color-border);')
	})

	it('uses no darker border on any board tab rule', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		let m
		while ((m = re.exec(css))) {
			if (m[1].includes('.cn-tabs--board') && m[1].includes('.cn-tabs__nav-item')) {
				expect(m[2]).not.toContain('--color-border-dark')
			}
		}
	})
})
