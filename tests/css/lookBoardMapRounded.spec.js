/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A map in a board card has the board's control corners (DqZaak "Locaties").
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-map-rounded/specs/board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: a map in a board card', () => {
	it('takes the control radius and clips its tiles, except fullscreen', () => {
		const rule = rulesFor('.cn-look-board .cn-map-widget:not(.cn-map-widget--fullscreen)')
		expect(rule).toContain('border-radius: var(--cn-board-control-radius)')
		expect(rule).toContain('overflow: hidden')
	})
})
