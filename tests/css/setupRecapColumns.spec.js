/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The setup wizard's recap is a table of aligned columns (board humaniq
 * HuInrichten: step, answer, explanation, Change). Each row sized itself
 * before, so a short answer cell broke inside a word ("Niet ingestel d").
 * Read from the component's stylesheet and template.
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnSetupWizard/CnSetupWizard.vue'), 'utf8')
const css = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every top-level rule whose selector list holds the selector.
 *
 * @param {string} selector The selector to look for.
 * @return {string} The bodies, joined.
 */
function bodiesFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let body = ''
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			body += m[2]
		}
	}
	return body
}

describe('CnSetupWizard recap columns', () => {
	it('lays the recap out as one grid of five columns', () => {
		const list = bodiesFor('.cn-setup-summary')
		expect(list).toMatch(/display:\s*grid/)
		expect(list).toMatch(/grid-template-columns:\s*auto max-content fit-content\(16em\) minmax\(0, 1fr\) auto/)
	})

	it('lets every row take the list\'s columns', () => {
		const row = bodiesFor('.cn-setup-summary__item')
		expect(row).toMatch(/grid-column:\s*1 \/ -1/)
		expect(row).toMatch(/grid-template-columns:\s*subgrid/)
	})

	it.each([
		['.cn-setup-summary__mark', '1'],
		['.cn-setup-summary__label', '2'],
		['.cn-setup-summary__value', '3'],
		['.cn-setup-summary__hint', '4'],
		['.cn-setup-summary__change', '5'],
	])('puts %s in column %s', (selector, column) => {
		expect(bodiesFor(selector)).toMatch(new RegExp(`grid-column:\\s*${column};`))
	})

	it('stacks the answer and the explanation under the step in a narrow dialog', () => {
		const narrowAt = css.indexOf('@media (width <= 600px)')
		// After the base rules, or they win the cascade and the narrow layout never applies.
		expect(narrowAt).toBeGreaterThan(css.indexOf('.cn-setup-summary__value {'))
		expect(narrowAt).toBeGreaterThan(css.indexOf('.cn-setup-summary__change {'))
		const narrow = css.slice(narrowAt)
		expect(narrow).toMatch(/\.cn-setup-summary \{\s*grid-template-columns:\s*auto minmax\(0, 1fr\) auto;/)
		expect(narrow).toMatch(/\.cn-setup-summary__value \{\s*grid-column:\s*2 \/ -1;\s*grid-row:\s*2;/)
		expect(narrow).toMatch(/\.cn-setup-summary__hint \{\s*grid-column:\s*2 \/ -1;\s*grid-row:\s*3;/)
		expect(narrow).toMatch(/\.cn-setup-summary__change \{\s*grid-column:\s*3;\s*grid-row:\s*1;/)
	})

	it('wraps an answer between words, never inside one', () => {
		const value = bodiesFor('.cn-setup-summary__value')
		expect(value).not.toMatch(/overflow-wrap:\s*anywhere/)
		expect(value).toMatch(/overflow-wrap:\s*break-word/)
	})

	it('reads the explanation before the Change button, in the board\'s order', () => {
		const tpl = sfc.slice(sfc.indexOf('class="cn-setup-summary"'))
		expect(tpl.indexOf('cn-setup-summary__hint')).toBeLessThan(tpl.indexOf('cn-setup-summary__change'))
	})
})
