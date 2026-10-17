/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionButtons in the board look draws a page's secondary actions as the
 * boards do: neutral 40px buttons on the main background with a grey border
 * and the main text at 600 (DqZaak "Bericht", "Document"), not Nextcloud's
 * primary tint. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: CnActionButtons', () => {
	const button = '.cn-look-board .cn-action-buttons .button-vue--secondary:not(.cn-look-nextcloud *)'

	it('draws a secondary action neutral: main background, grey border, main text at 600', () => {
		const rule = rulesFor(button)
		expect(rule).toContain('background: var(--color-main-background)')
		expect(rule).toContain('border: 1px solid var(--color-border-dark)')
		expect(rule).toContain('color: var(--color-main-text)')
		expect(rule).toContain('font-weight: 600')
	})

	it('keeps the board control size and radius', () => {
		const rule = rulesFor(button)
		expect(rule).toContain('height: var(--cn-board-control-height)')
		expect(rule).toContain('border-radius: var(--cn-board-control-radius)')
		expect(rule).toContain('padding: 0 14px')
	})

	it('hands the label its ink under a theme that forces the body ink', () => {
		expect(rulesFor(button)).toContain('--nldesign-color-on-surface: var(--color-main-text)')
	})

	it('covers the older secondary class too', () => {
		expect(rulesFor('.cn-look-board .cn-action-buttons .button-vue--vue-secondary:not(.cn-look-nextcloud *)')).toContain('background: var(--color-main-background)')
	})
})
