/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqFilterInMenu: the table beside the open side panel keeps the auto layout,
 * so its columns fit their content. The index table's fixed layout skips fit
 * tables with a :not(), which made it more specific than the side-panel rule;
 * the side-panel rule must still win.
 *
 * @spec openspec/changes/board-table-fits-beside-side-panel/specs/board-table-fits-beside-side-panel/spec.md#requirement-the-table-fits-its-column-beside-the-open-side-panel
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Every rule as its selectors, body and position.
 *
 * @return {Array<{selectors: string[], body: string, index: number}>} The rules in order.
 */
function rules() {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css)) !== null) {
		out.push({ selectors: m[1].split(/,(?![^()]*\))/).map((s) => s.trim()), body: m[2], index: m.index })
	}
	return out
}

/**
 * Class-level specificity of a selector, :not()/:has()/:is() counted by
 * their most specific argument.
 *
 * @param {string} selector The selector.
 * @return {number} The number of class-level parts.
 */
function classWeight(selector) {
	let s = selector
	let weight = 0
	const fn = /:(not|has|is)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/
	let m
	while ((m = fn.exec(s)) !== null) {
		weight += Math.max(...m[2].split(/,(?![^()]*\))/).map((a) => classWeight(a)))
		s = s.slice(0, m.index) + s.slice(m.index + m[0].length)
	}
	return weight + (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || []).length
}

/**
 * The strongest selector, and its position, of the rules that set a table layout.
 *
 * @param {string} value `fixed` or `auto`.
 * @param {RegExp} match A test on the selector.
 * @return {{weight: number, index: number}} Weight and position, -1 when none.
 */
function strongest(value, match) {
	let best = { weight: -1, index: -1 }
	for (const rule of rules()) {
		if (!new RegExp(`table-layout: ${value};`).test(rule.body)) {
			continue
		}
		for (const selector of rule.selectors.filter((s) => match.test(s))) {
			const weight = classWeight(selector)
			if (weight > best.weight || (weight === best.weight && rule.index > best.index)) {
				best = { weight, index: rule.index }
			}
		}
	}
	return best
}

describe('look-board-index.css: the table beside the open side panel', () => {
	it('keeps the index table fixed when the side panel is closed (control)', () => {
		expect(strongest('fixed', /cn-index-page__main--table .cn-table-container--board .cn-data-table/).weight).toBeGreaterThan(0)
	})

	it('lets the side panel rule win over the fixed layout', () => {
		const fixed = strongest('fixed', /cn-index-page__main--table .cn-table-container--board .cn-data-table/)
		const auto = strongest('auto', /cn-index-page--sidebar-open .cn-table-container--board .cn-data-table/)
		expect(auto.weight > fixed.weight || (auto.weight === fixed.weight && auto.index > fixed.index)).toBe(true)
	})
})
