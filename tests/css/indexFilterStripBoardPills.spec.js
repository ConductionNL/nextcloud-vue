/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The second filter strip (`filterStrip`, board PqWachtrij "Soort, dan
 * kanaal") stands under the toolbar and draws the board's outlined 17px
 * pills. COMPDIFF pl6 found it under the list, beside nothing, as tonal 8px
 * buttons at 15px bold: on a page with a side panel the grid had no area for
 * it, so it fell into the trailing `extra` row, and the server's
 * `button:not(.button-vue, ...)` rule (0,1,1) outranked the one-class pill
 * rules. Read from the stylesheet text.
 *
 * @spec openspec/changes/filter-strip-board-pills/specs/index-filter-strip/spec.md#requirement-the-filter-strip-stands-under-the-toolbar-in-the-boards-pills
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/index-page.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string[]} The bodies.
 */
function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out
}

const GRID = ':is(.cn-index-page--with-side-panel, .cn-index-page--split-side)'

describe('index-page.css: the filter strip', () => {
	it('has a row of its own between the toolbar and the list beside a side panel', () => {
		const [wide, narrow] = bodiesOf(GRID).filter((b) => b.includes('grid-template-areas'))
		expect(wide.replace(/\s+/g, ' ')).toContain('"bar side" "strip side" "body side"')
		expect(narrow.replace(/\s+/g, ' ')).toContain('"bar" "strip" "body"')
		for (const body of [wide, narrow]) {
			const rows = body.match(/grid-template-rows:([^;]*);/)[1].trim().split(/\s+(?![^(]*\))/)
			const areas = body.match(/grid-template-areas:([^;]*);/)[1].match(/"[^"]*"/g)
			expect(rows).toHaveLength(areas.length)
		}
		expect(bodiesOf(`${GRID} > .cn-index-page__filter-strip`).join('')).toContain('grid-area: strip;')
	})

	it('draws its pills with one class more than the server button rule', () => {
		const pill = bodiesOf('.cn-index-page .cn-index-page__filter-strip-pill').join('')
		expect(pill).toContain('border-radius: 17px;')
		expect(pill).toContain('font-size: 14px;')
		expect(bodiesOf('.cn-index-page__filter-strip-pill')).toHaveLength(0)
		expect(bodiesOf('.cn-index-page .cn-index-page__filter-strip-pill--active').join('')).toContain('background: var(--color-main-text);')
	})
})
