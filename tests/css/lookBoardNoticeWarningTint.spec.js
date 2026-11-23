/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board notice ("Advies gevraagd" on 12 Dq case boards, DqZaaktypeOverzicht)
 * sits on the theme's warning tint, the one a warning pill takes
 * (`--nl-color-orange-light`, #FFF4DE on every board). Nextcloud 34 has no
 * `--color-warning-light`, so the old chain always fell to its own #fdf1d6.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-notice-warning-tint/specs/board-notice-warning-tint/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: the board notice ground', () => {
	it('reads the theme\'s warning tint first and falls back to the boards\' #fff4de', () => {
		const m = css.match(/--cn-board-notice-bg:\s*([^;]+);/)
		expect(m).not.toBeNull()
		expect(m[1].replace(/\s+/g, ' ').trim()).toBe('var(--nl-color-orange-light, #fff4de)')
	})

	it('keeps the warning text as its ink', () => {
		expect(css).toMatch(/--cn-board-notice-ink:\s*var\(--color-warning-text, #7a4f00\);/)
	})
})
