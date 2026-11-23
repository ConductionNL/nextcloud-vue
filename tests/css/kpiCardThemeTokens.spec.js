/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A custom property declared on `:root` that reads a theme colour resolves
 * that colour at `:root`. A theme that sets the colour on `body` (Nextcloud's
 * `body[data-themes]`, thematiq's systems) is then ignored by every KPI label:
 * measured on dossiq with thematiq, the label kept the `:root` grey #75758a
 * (4.49:1 on white, fails WCAG 1.4.3) while the theme's body value was #5E6168.
 * Every use carries the theme colour as its `var()` fallback, so the colour
 * tokens stay undeclared and resolve on the element.
 */

const fs = require('fs')
const path = require('path')

const CSS = fs.readFileSync(
	path.join(__dirname, '..', '..', 'src', 'css', 'kpi-card.css'),
	'utf8',
)

function rootBlocks(css) {
	const blocks = []
	const re = /(^|\n):root\s*\{([^}]*)\}/g
	let m
	while ((m = re.exec(css)) !== null) {
		blocks.push(m[2])
	}
	return blocks
}

describe('kpi-card.css — theme colours resolve on the element', () => {
	it('has a :root token block', () => {
		expect(rootBlocks(CSS).length).toBeGreaterThan(0)
	})

	it('declares no :root token that reads a theme colour', () => {
		const offending = rootBlocks(CSS)
			.flatMap((block) => block.split(';'))
			.filter((decl) => /--cn-[\w-]+\s*:/.test(decl) && /var\(--color-/.test(decl))
			.map((decl) => decl.replace(/\/\*[\s\S]*?\*\//g, '').trim())
		expect(offending).toEqual([])
	})

	it('falls back to the theme colour wherever the label and accent tokens are read', () => {
		const reads = CSS.match(/var\(--cn-kpi-(label-color|accent)\b[^;]*/g) || []
		expect(reads.length).toBeGreaterThan(0)
		for (const read of reads) {
			expect(read).toMatch(/var\(--cn-kpi-(label-color|accent),\s*var\(--color-/)
		}
	})
})
