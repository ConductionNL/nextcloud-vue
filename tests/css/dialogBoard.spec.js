/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * jsdom lays nothing out, so the board dialog's measurements are asserted on
 * the stylesheet itself: the width cap, the frame, the header, the footer.
 *
 * @spec openspec/changes/screens-dialog-parity/tasks.md#task-2
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8')
const indexCss = fs.readFileSync(path.join(__dirname, '../../src/css/index.css'), 'utf8')

describe('dialog.css', () => {
	it('is part of the library stylesheet', () => {
		expect(indexCss).toContain("@import './dialog.css'")
		expect(indexCss).toContain("@import './form-field.css'")
	})

	it('caps the width at the viewport minus 32px, so a 390px phone gets 358px', () => {
		expect(css).toMatch(/max-width:\s*min\(var\(--cn-dialog-width\),\s*calc\(100% - 32px\)\)/)
	})

	it('scopes every rule under the board container', () => {
		const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^[^{}@]+(?=\{)/gm).map((s) => s.trim())
		for (const selector of selectors) {
			for (const part of selector.split(',').map((p) => p.trim())) {
				expect(part).toMatch(/cn-dialog-board|cn-dialog-header|cn-dialog__/)
			}
		}
	})

	it('draws the frame: radius 12, shadow 0 12px 40px at 28%, backdrop at 45%', () => {
		expect(css).toMatch(/border-radius:\s*var\(--cn-board-card-radius,\s*12px\)/)
		expect(css).toMatch(/box-shadow:\s*0 12px 40px color-mix\(in srgb, var\(--color-main-text\) 28%, transparent\)/)
		expect(css).toMatch(/color-mix\(in srgb, var\(--color-main-text\) 45%, transparent\)/)
	})

	it('draws the header: 20px/700 title, 13px/700 eyebrow at 0.06em, 36px round close', () => {
		expect(css).toMatch(/\.cn-dialog-header__title\s*\{[^}]*font-size:\s*20px;[^}]*font-weight:\s*700/)
		expect(css).toMatch(/\.cn-dialog-header__eyebrow\s*\{[^}]*font-size:\s*13px;[^}]*font-weight:\s*700;[^}]*letter-spacing:\s*0\.06em/)
		expect(css).toMatch(/\.cn-dialog-header__close\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;[^}]*border-radius:\s*50%/)
	})

	it('draws the body and footer: 18px gap, 16px 24px with a 1px hairline, 10px between buttons', () => {
		expect(css).toMatch(/\.dialog__content\s*\{[^}]*gap:\s*18px/)
		expect(css).toMatch(/\.dialog__actions\s*\{[^}]*gap:\s*10px;[^}]*padding:\s*16px 24px;[^}]*border-top:\s*1px solid var\(--color-border\)/)
	})

	it('puts the tertiary region at the far left and fills a destructive primary with the danger token', () => {
		expect(css).toMatch(/\.cn-dialog__tertiary\s*\{[^}]*margin-inline-end:\s*auto/)
		expect(css).toMatch(/--cn-dialog-danger:\s*var\(--color-error\)/)
		expect(css).toMatch(/background-color:\s*var\(--cn-dialog-danger\)/)
	})

	it('holds a type-to-confirm button at 45% opacity', () => {
		expect(css).toMatch(/\.cn-dialog__confirm-pending\s*\{[^}]*opacity:\s*0\.45/)
	})
})
