/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The index header buttons keep the board's button under a theme that styles
 * every button with `!important`: Download and the Actions menu a grey border
 * on the main background, the primary button the primary fill. jsdom draws no
 * layout, so the values are read from the stylesheet text.
 *
 * @spec openspec/changes/screens-index-header-buttons-parity/specs/index-list-board-look/spec.md#requirement-the-header-buttons-keep-the-board-button-under-any-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rulesEndingWith(needle) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).some((s) => s.endsWith(needle))) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: header buttons', () => {
	it('draws Download and the Actions menu with a grey border that outranks a theme', () => {
		for (const needle of ['.cn-index-page__header-buttons > .button-vue--secondary', '.cn-index-page__header-buttons > .action-item .button-vue']) {
			const body = rulesEndingWith(needle)
			expect(body).toMatch(/border:\s*1px solid var\(--color-border-dark\) !important/)
			expect(body).toMatch(/background:\s*var\(--color-main-background\) !important/)
			expect(body).toMatch(/padding:\s*0 14px !important/)
			expect(body).toMatch(/height:\s*var\(--cn-board-control-height\) !important/)
			expect(body).not.toMatch(/--color-primary-element/)
		}
	})

	it('draws the primary button as the primary fill without a border', () => {
		const body = rulesEndingWith('.cn-index-page__header-buttons > .button-vue--primary')
		expect(body).toMatch(/border:\s*0 !important/)
		expect(body).toMatch(/background:\s*var\(--color-primary-element\) !important/)
		expect(body).toMatch(/padding:\s*0 16px !important/)
	})

	it('scopes the rules under .cn-look-board', () => {
		const re = /([^{}]+)\{[^{}]*\}/g
		let m
		while ((m = re.exec(css))) {
			for (const selector of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
				if (selector.includes('cn-index-page__header-buttons')) {
					expect(selector.startsWith('.cn-look-board .cn-index-page')).toBe(true)
				}
			}
		}
	})
})
