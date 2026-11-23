/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board banner's link and button actions are drawn alike: 40px, no outer
 * margin (DqMijnWerk "Vandaag eerst"). Read from the stylesheet.
 *
 * @spec openspec/changes/board-banner-actions-as-drawn/specs/board-banner-actions-as-drawn/spec.md#requirement-a-board-banners-actions-are-drawn-alike
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board: banner actions drawn alike', () => {
	it('fixes their height at the board control height and drops the margin', () => {
		const sel = '.cn-look-board .cn-banner-widget__action.cn-banner-widget__action:not(.cn-look-nextcloud *)'
		const at = css.indexOf(`${sel} {`)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toMatch(/height: var\(--cn-board-control-height\)/)
		expect(body).toMatch(/min-height: 0/)
		expect(body).toMatch(/margin: 0/)
	})
})
