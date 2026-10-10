/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board table's rows: only the title is underlined, a plain title is bold
 * without an underline, and the row menu is a 34px grey-bordered square that a
 * theme's `!important` secondary button cannot widen or colour. jsdom draws no
 * layout, so the values are read from the stylesheet text.
 *
 * @spec openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-a-row-title-can-be-plain-text
 * @spec openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-the-title-link-underlines-the-title-only
 * @spec openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-the-row-menu-keeps-its-board-border-under-any-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Concatenated rule bodies whose selector list has a selector ending in `needle`. */
function rulesEndingWith(needle) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).some((s) => s.endsWith(needle))) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: table rows', () => {
	it('keeps the secondary line out of the title underline', () => {
		const body = rulesEndingWith('.cn-table-container--board .cn-data-table td.cn-table-col--title .cn-table-cell__secondary')
		expect(body).toMatch(/display:\s*inline-block/)
		expect(body).toMatch(/width:\s*100%/)
	})

	it('draws a plain title bold, without an underline, over a 13px secondary line', () => {
		const title = rulesEndingWith('.cn-table-container--title-plain .cn-data-table td.cn-table-col--title')
		expect(title).toMatch(/font-weight:\s*700/)
		expect(title).toMatch(/text-decoration:\s*none/)
		const secondary = rulesEndingWith('.cn-table-container--title-plain .cn-data-table td.cn-table-col--title .cn-table-cell__secondary')
		expect(secondary).toMatch(/font-size:\s*13px/)
		expect(secondary).toMatch(/margin-top:\s*2px/)
	})

	it('makes the row menu a 34px square with a grey border that outranks a theme', () => {
		const body = rulesEndingWith('.cn-row-actions--board .button-vue')
		for (const decl of [
			/width:\s*34px !important/,
			/min-width:\s*34px !important/,
			/height:\s*34px !important/,
			/padding:\s*0 !important/,
			/border:\s*1px solid var\(--color-border-dark\) !important/,
			/border-radius:\s*8px !important/,
			/background:\s*var\(--color-main-background\) !important/,
		]) {
			expect(body).toMatch(decl)
		}
		expect(body).not.toMatch(/--color-primary-element/)
	})

	it('scopes every new rule under .cn-look-board', () => {
		const re = /([^{}]+)\{[^{}]*\}/g
		let m
		while ((m = re.exec(css))) {
			for (const selector of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
				if (/title-plain|cn-row-actions--board|cn-table-col--title/.test(selector)) {
					expect(selector.startsWith('.cn-look-board')).toBe(true)
				}
			}
		}
	})
})
