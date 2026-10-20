/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a dashboard card draws no rule under its title, and its
 * title sits on the card's side inset. jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-card-header/specs/board-dashboard-card-header/spec.md#requirement-a-board-dashboard-card-draws-no-header-rule
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const CARD = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper'

/**
 * Every rule as its selectors and its body.
 *
 * @return {Array<{selectors: string[], body: string}>} The rules.
 */
function rules() {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		out.push({ selectors: m[1].split(',').map((s) => s.trim()), body: m[2] })
	}
	return out
}

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const rule = rules().find((r) => r.selectors.includes(selector))
	return rule ? rule.body : ''
}

describe('look-board.css: dashboard card header', () => {
	it('defines the dashboard card inset as 24px', () => {
		expect(css).toMatch(/\.cn-look-board\s*\{[^}]*--cn-board-dashboard-card-inset:\s*24px;/)
	})

	it('draws no rule under the title of any card but the Nextcloud dashboard one', () => {
		expect(bodyOf(`${CARD}:not(.cn-widget-wrapper--nc-dashboard) .cn-widget-wrapper__header`)).toMatch(/border-bottom:\s*none;/)
	})

	it('puts the title on the card inset, 20px from the top and 12px above the content, less the first line\'s leading', () => {
		expect(bodyOf(`${CARD}:not(.cn-widget-wrapper--nc-dashboard):not(.cn-widget-wrapper--borderless) .cn-widget-wrapper__header`))
			.toMatch(/padding:\s*20px var\(--cn-board-dashboard-card-inset\) calc\(12px - var\(--cn-board-first-line-leading, 0\.15em\)\);/)
	})

	it('needs no per-widget rule to drop the line', () => {
		const perWidget = rules()
			.filter((r) => /border-bottom:\s*none/.test(r.body))
			.flatMap((r) => r.selectors)
			.filter((s) => s.startsWith(CARD) && s.includes(':has(') && s.endsWith('.cn-widget-wrapper__header'))
		expect(perWidget).toEqual([])
	})
})
