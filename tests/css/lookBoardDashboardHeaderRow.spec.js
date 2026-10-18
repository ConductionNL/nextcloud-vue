/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dashboard header (actions on the title row, the description and
 * its period group under both at full width) and the board KPI row's tile
 * inset, both scoped to the board look. jsdom lays nothing out, so the rules
 * are read from the stylesheet; e2e/comp2-termijnen-board.e2e.js measures
 * them in a browser.
 *
 * @spec openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-the-board-dashboard-header-keeps-its-actions-on-the-title-row
 * @spec openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-a-board-kpi-row-tile-has-the-boards-inset
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Every rule as `{ selectors, body }`.
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
 * The declarations of every rule listing an exact selector, joined, or null.
 *
 * @param {string} selector The selector.
 * @return {string|null} The declarations.
 */
function bodyOf(selector) {
	const bodies = rules().filter((r) => r.selectors.includes(selector)).map((r) => r.body)
	return bodies.length > 0 ? bodies.join('\n') : null
}

const PAGE = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

describe('look-board.css: the board dashboard header row', () => {
	it('lays the header out as a grid of the title column and the actions', () => {
		const body = bodyOf(`${PAGE} .cn-dashboard-page__header`)
		expect(body).toMatch(/display:\s*grid/)
		expect(body).toMatch(/grid-template-columns:\s*minmax\(min-content,\s*1fr\)\s+auto/)
	})

	it('puts the actions on the title row and the rest of the left column under both', () => {
		expect(bodyOf(`${PAGE} .cn-dashboard-page__header-left`)).toMatch(/display:\s*contents/)
		expect(bodyOf(`${PAGE} .cn-dashboard-page__title-row`)).toMatch(/grid-row:\s*1/)
		const actions = bodyOf(`${PAGE} .cn-dashboard-page__header > .cn-dashboard-page__header-actions`)
		expect(actions).toMatch(/grid-column:\s*2/)
		expect(actions).toMatch(/grid-row:\s*1/)
		expect(bodyOf(`${PAGE} .cn-dashboard-page__header-left > :not(.cn-dashboard-page__title-row)`)).toMatch(/grid-column:\s*1\s*\/\s*-1/)
	})
})

describe('look-board.css: the board KPI row tile', () => {
	it('drops the card-fit padding around a stacked board stat tile in the KPI row', () => {
		const body = bodyOf(`${PAGE} .cn-dashboard-page__kpi-cell .cn-dashboard-page__card-fit .cn-widget-wrapper__content:has(> .cn-kpi-card--board.cn-kpi-card--stacked)`)
		expect(body).toMatch(/padding:\s*0/)
	})

	it('scopes every new rule to the board look', () => {
		const touched = rules().flatMap((r) => r.selectors).filter((s) => /__header-left|__title-row|__kpi-cell/.test(s))
		expect(touched.length).toBeGreaterThan(0)
		for (const selector of touched) {
			expect(selector.startsWith('.cn-look-board ')).toBe(true)
		}
	})
})
