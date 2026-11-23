/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak "Afspraken": the appointments card has a subtitle, and the rule that
 * starts a subtitled card's content 12px under its header is more specific
 * than the appointments rule. The appointments start must win there too.
 *
 * @spec openspec/changes/board-events-card-under-subtitle/specs/board-events-card-under-subtitle/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The selector lists and bodies of every rule.
 *
 * @return {Array<{selectors: string[], body: string}>} The rules in order.
 */
function rules() {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css)) !== null) {
		out.push({ selectors: m[1].split(/,(?![^()]*\))/).map((s) => s.trim()), body: m[2] })
	}
	return out
}

/**
 * Class-level specificity of a selector: classes, attributes and pseudo-classes,
 * with :not()/:has() counted by their argument as the CSS spec does.
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

describe('look-board-detail.css: appointments under a subtitle', () => {
	const subtitled = '.cn-look-board .cn-detail-page .cn-widget-wrapper:not(.cn-detail-page__side *):has(> .cn-widget-wrapper__header .cn-widget-wrapper__subtitle) > .cn-widget-wrapper__content'

	it('keeps the subtitled card content rule at 12px (control)', () => {
		const rule = rules().find((r) => r.selectors.includes(subtitled))
		expect(rule.body).toMatch(/padding-top: 12px;/)
	})

	it('starts a subtitled appointments card 8px under its header, over the 12px rule', () => {
		const weight12 = classWeight(subtitled)
		const winners = rules().filter((r) => /padding-top: 8px;/.test(r.body))
			.flatMap((r) => r.selectors)
			.filter((s) => s.includes('.cn-events-card') && s.includes('.cn-widget-wrapper__subtitle') && classWeight(s) > weight12)
		expect(winners.length).toBeGreaterThan(0)
	})
})
