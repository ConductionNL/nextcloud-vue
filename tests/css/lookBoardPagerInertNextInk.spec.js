/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The inert "Next" of a single-page board pager is drawn in the main text
 * colour like every other page link; the boards draw it so on DqContacten,
 * DqContracten, DqOrganisaties and DqZoekresultaten. It stays inert
 * (aria-disabled, default cursor). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-pager-inert-next-ink/specs/board-pager-inert-next-ink/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
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

const inert = '.cn-look-board .cn-pagination--board .cn-pagination__board-link--disabled'

describe('look-board-index.css: the inert Next of a single page', () => {
	it('keeps the page links\' main text colour', () => {
		expect(rulesFor(inert)).not.toMatch(/color:\s*var\(--color-text-maxcontrast\)/)
		expect(rulesFor('.cn-look-board .cn-pagination--board .cn-pagination__board-link')).toMatch(/color:\s*var\(--color-main-text\)/)
	})

	it('stays inert', () => {
		expect(rulesFor(inert)).toMatch(/cursor:\s*default/)
	})
})
