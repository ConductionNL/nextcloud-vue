/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The filter strip's pills stand 8px apart and the active pill draws no edge,
 * as board PqWachtrij does. The server's
 * `button:not(.button-vue,[class^=vs__]):not(.app-navigation-entry-button)`
 * rule (0,2,1) adds a 3px right margin that the two-class pill rule (0,2,0)
 * cannot take back. Read from the stylesheet text.
 *
 * @spec openspec/changes/filter-strip-pill-flush/specs/index-filter-strip/spec.md#requirement-the-filter-strip-pills-stand-8px-apart
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

const STRIP = '.cn-index-page .cn-index-page__filter-strip'

describe('index-page.css: the filter strip pills', () => {
	it('take no margin with three classes, above the server button rule', () => {
		expect(bodiesOf(`${STRIP} > .cn-index-page__filter-strip-pill`).join('')).toMatch(/margin:\s*0;/)
	})

	it('draw the active pill without an edge', () => {
		const active = bodiesOf(`${STRIP} > .cn-index-page__filter-strip-pill--active`).join('')
		expect(active).toMatch(/border-width:\s*0;/)
	})

	it('leave the strip gap at 8px', () => {
		expect(bodiesOf('.cn-index-page__filter-strip').join('')).toMatch(/gap:\s*8px;/)
	})
})
