/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dialog keeps its 12px radius, its shadow and its 24px inset
 * under the nldesign theme and NcDialog's own container padding. jsdom draws
 * no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-dialog-theme/specs/board-dialog-theme/spec.md#requirement-a-board-dialog-keeps-its-frame-and-inset-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('dialog.css: the board dialog under the nldesign theme', () => {
	it('hands the 12px radius to the theme\'s dialog radius token', () => {
		expect(css).toMatch(/\.cn-dialog-board\s*\{[^}]*--nldesign-component-dialog-border-radius:\s*var\(--cn-board-card-radius,\s*12px\);/)
	})

	it('keeps the shadow against the theme\'s !important none', () => {
		expect(css).toMatch(/box-shadow:\s*0 12px 40px color-mix\(in srgb, var\(--color-main-text\) 28%, transparent\) !important;/)
	})

	it('drops NcDialog\'s container padding', () => {
		expect(css).toMatch(/\.modal-mask\.cn-dialog-board\.dialog__modal \.modal-wrapper \.modal-container\s*\{\s*padding:\s*0;\s*\}/)
	})

	it('keeps the bottom sheet\'s top radius on a phone', () => {
		expect(css).toMatch(/@media \(max-width: 600px\)[\s\S]*\.cn-dialog-board\s*\{\s*--nldesign-component-dialog-border-radius:\s*16px 16px 0 0;\s*\}/)
	})
})
