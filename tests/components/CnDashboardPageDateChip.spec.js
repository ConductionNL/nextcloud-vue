/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests that the dashboard date-range chip is not squeezed into NcButton's
 * square clickable area.
 *
 * The defect: the chip label lives in NcActions' icon slot, so the trigger
 * button's text slot (filled from `menuName`, which the chip does not use)
 * renders empty — and NcButton pins an icon-only button to a square with
 *
 *   .button-vue[data-v-…]:has(.button-vue__text:empty):not(.button-vue--wide) {
 *     width: var(--button-size) !important;
 *   }
 *
 * Two `!important` declarations are settled by specificity, and the chip's
 * plain descendant override lost, so the button stayed ~34px while the pill
 * inside it was ~106px. With the chip's `overflow: visible`, the pill rendered
 * centred on the narrow box and spilled out both sides, over the widget title.
 *
 * The override therefore has to out-specify a rule that lives in an installed
 * dependency. That margin is invisible in the CSS and silently disappears on an
 * @nextcloud/vue upgrade, so it is asserted here against the NcButton
 * stylesheet actually installed rather than against a copied-out constant.
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const ASSETS = join(__dirname, '../../node_modules/@nextcloud/vue/dist/assets')
const SFC = readFileSync(join(__dirname, '../../src/components/CnDashboardPage/CnDashboardPage.vue'), 'utf8')

/**
 * Specificity of a single (complex) CSS selector as [ids, classes, elements].
 *
 * Enough of the spec for this comparison: ids, then the class column (classes,
 * attribute selectors, pseudo-classes), then the element column. `:has()` /
 * `:not()` / `:is()` contribute their most specific argument, which is the part
 * that makes NcButton's rule as strong as it is.
 *
 * @param {string} selector One selector, no commas.
 * @return {number[]} `[ids, classes, elements]`.
 */
function specificity(selector) {
	let rest = selector
	const total = [0, 0, 0]

	// Functional pseudo-classes first: recurse into the argument, then remove it
	// so the outer scan cannot count its parts twice.
	for (const fn of ['has', 'not', 'is']) {
		const re = new RegExp(`:${fn}\\(([^()]*)\\)`, 'g')
		rest = rest.replace(re, (_m, inner) => {
			const best = inner.split(',')
				.map((part) => specificity(part.trim()))
				.sort((a, b) => (b[0] - a[0]) || (b[1] - a[1]) || (b[2] - a[2]))[0] || [0, 0, 0]
			total[0] += best[0]
			total[1] += best[1]
			total[2] += best[2]
			return ' '
		})
	}

	total[0] += (rest.match(/#[\w-]+/g) || []).length
	total[1] += (rest.match(/\.[\w-]+/g) || []).length
	total[1] += (rest.match(/\[[^\]]*\]/g) || []).length
	// Pseudo-ELEMENTS are counted and then removed, so the pseudo-class scan
	// below cannot also match their name (`::before` → `:before`).
	total[2] += (rest.match(/::[\w-]+/g) || []).length
	rest = rest.replace(/::[\w-]+/g, ' ')
	total[1] += (rest.match(/:[\w-]+/g) || []).length
	// Bare element names — never `*`, and not the tail of a class/id/attr.
	total[2] += (rest.replace(/[.#][\w-]+/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/:[\w-]+/g, ' ')
		.match(/\b[a-z][\w-]*\b/g) || []).length

	return total
}

/**
 * Compare two specificity triples.
 *
 * @param {number[]} a Left triple.
 * @param {number[]} b Right triple.
 * @return {number} > 0 when `a` wins.
 */
function compare(a, b) {
	return (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2])
}

/** Rules from every installed NcButton stylesheet, as `{selector, body}`. */
function ncButtonRules() {
	const files = readdirSync(ASSETS).filter((name) => /^NcButton-.*\.css$/.test(name))
	expect(files.length).toBeGreaterThan(0)
	return files
		.flatMap((name) => readFileSync(join(ASSETS, name), 'utf8').split('}'))
		.map((chunk) => {
			const [selector, body] = chunk.split('{')
			return { selector: (selector || '').trim(), body: (body || '').trim() }
		})
		.filter((rule) => rule.selector.includes('.button-vue') && rule.body)
}

/** The chip's own width overrides, from the SFC's unscoped style block. */
function chipWidthOverrides() {
	const unscoped = SFC.slice(SFC.lastIndexOf('<style>'), SFC.lastIndexOf('</style>'))
		.replace(/\/\*[\s\S]*?\*\//g, '')
	return unscoped
		.split('}')
		.map((chunk) => {
			const [selector, body] = chunk.split('{')
			return { selector: (selector || '').replace(/\s+/g, ' ').trim(), body: (body || '').trim() }
		})
		.filter((rule) => rule.selector.includes('cn-dashboard-page-date-chip-')
			&& /\bwidth:\s*auto\s*!important/.test(rule.body))
}

describe('specificity helper', () => {
	it('CONTROL: counts the columns the way the cascade does', () => {
		expect(specificity('.a')).toEqual([0, 1, 0])
		expect(specificity('[data-x] .a.b')).toEqual([0, 3, 0])
		expect(specificity('div.a::before')).toEqual([0, 1, 2])
		// The case that matters: `:has()` takes its argument's specificity.
		expect(specificity('.button-vue[data-v-1]:has(.button-vue__text:empty):not(.button-vue--wide)')).toEqual([0, 5, 0])
	})
})

describe('CnDashboardPage — the date chip is not squeezed into a square button', () => {
	it('declares a width override for the chip trigger at all', () => {
		expect(chipWidthOverrides().length).toBeGreaterThan(0)
	})

	it('out-specifies every NcButton rule that forces a width with !important', () => {
		const forced = ncButtonRules().flatMap((rule) => rule.selector
			.split(',')
			.map((selector) => selector.trim())
			.filter((selector) => selector.includes('.button-vue')
				&& /\bwidth:[^;]*!important/.test(rule.body))
			.map((selector) => ({ selector, spec: specificity(selector) })))

		// If NcButton stops forcing a width, the arms race is over and there is
		// nothing left to assert — but say so rather than passing silently.
		expect(forced.length).toBeGreaterThan(0)

		const ours = chipWidthOverrides().map((rule) => ({ selector: rule.selector, spec: specificity(rule.selector) }))
		const strongest = ours.sort((a, b) => compare(b.spec, a.spec))[0]

		for (const rule of forced) {
			expect({
				theirs: rule.selector,
				ours: strongest.selector,
				oursWins: compare(strongest.spec, rule.spec) > 0,
			}).toEqual({ theirs: rule.selector, ours: strongest.selector, oursWins: true })
		}
	})

	it('applies exactly where NcButton\'s rule does, by re-stating its predicate', () => {
		// Narrower than a blanket override: the chip trigger keeps NcButton's
		// normal sizing whenever the text slot is NOT empty, and the whole rule
		// drops out alongside NcButton's on a browser without `:has()`.
		const strongest = chipWidthOverrides()
			.map((rule) => ({ selector: rule.selector, spec: specificity(rule.selector) }))
			.sort((a, b) => compare(b.spec, a.spec))[0]
		expect(strongest.selector).toContain(':has(.button-vue__text:empty)')
	})

	it('keeps the override unscoped, so a chunk-split consumer still matches', () => {
		// Same reason the rest of the chip CSS is unscoped: a consumer that
		// splits the library across webpack chunks can render an instance whose
		// `data-v-*` differs from the one compiled into the scoped sheet.
		const scoped = SFC.slice(SFC.indexOf('<style scoped>'), SFC.indexOf('</style>'))
		expect(scoped).not.toContain('cn-dashboard-page-date-chip-')
	})
})
