/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files bulk bar in the board look is the board's selection band
 * (DqDocumentenBeheer): 10px 14px, radius 10, the count in the band's ink,
 * 34px buttons with words only. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-files-bulk-bar/specs/board-files-bulk-bar/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const bar = '.cn-look-board .cn-files-browser__bulk-bar:not(.cn-look-nextcloud *)'

describe('look-board-detail.css: the files bulk bar', () => {
	it('is the board band', () => {
		const body = rule(bar)
		expect(body).toMatch(/padding:\s*10px 14px/)
		expect(body).toMatch(/border-radius:\s*10px/)
		expect(body).toMatch(/font-size:\s*14px/)
		expect(rule(bar + ' .cn-files-browser__bulk-count')).toMatch(/color:\s*var\(--color-primary-element-light-text\)/)
	})

	it('draws 34px buttons with words only', () => {
		const button = rule(bar + ' .button-vue')
		expect(button).toMatch(/height:\s*34px/)
		expect(button).toMatch(/min-height:\s*34px/)
		expect(button).toMatch(/padding:\s*0 12px/)
		expect(rule(bar + ' .button-vue__icon')).toMatch(/display:\s*none/)
	})
})
