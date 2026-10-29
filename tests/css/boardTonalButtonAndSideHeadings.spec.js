/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's tonal pill is one class any button can take (`cn-button--tonal`):
 * 34px high, 12px in, no border, a 17px radius, the primary tint and its ink at
 * 13/600. In the board look it outweighs the neutral secondary and tertiary
 * looks. A side card whose widget draws its own heading (the timeline's
 * "Geschiedenis", an app's `cn-side-heading`) reads as every side card title:
 * a 15px muted label. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(css, selector) {
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

describe('the tonal pill button', () => {
	it('draws the pill anywhere: 34px, 12px in, no border, radius 17, 13/600', () => {
		const rule = rulesFor(read('main.css'), '.cn-button--tonal.button-vue')
		expect(rule).toContain('height: 34px')
		expect(rule).toContain('padding: 0 12px')
		expect(rule).toContain('border: 0')
		expect(rule).toContain('border-radius: 17px')
		expect(rule).toContain('font-size: 13px')
		expect(rule).toContain('font-weight: 600')
		expect(rule).toContain('background-color: var(--cn-tonal-bg, var(--color-primary-element-light))')
		expect(rule).toContain('color: var(--cn-tonal-ink, var(--color-primary-element-light-text))')
	})

	it('reads the tint above the button, where NcButton has not redefined it', () => {
		const rule = rulesFor(read('main.css'), 'body')
		expect(rule).toContain('--cn-tonal-bg: var(--color-primary-element-light)')
		expect(rule).toContain('--cn-tonal-ink: var(--color-primary-element-light-text)')
	})

	it("outweighs the board look's neutral buttons", () => {
		const rule = rulesFor(read('look-board.css'), '.cn-look-board .button-vue.cn-button--tonal.cn-button--tonal:not(.cn-look-nextcloud *)')
		expect(rule).toContain('background-color: var(--cn-tonal-bg)')
		expect(rule).toContain('color: var(--cn-tonal-ink)')
		expect(rule).toContain('border: 0')
		expect(rule).toContain('height: 34px')
	})

	it('draws an action menu named as a tonal pill the same way', () => {
		expect(rulesFor(read('main.css'), '.cn-button--tonal .action-item__menutoggle.button-vue')).toContain('border-radius: 17px')
	})
})

describe('self-titled side cards', () => {
	const css = read('look-board-detail.css')

	for (const heading of ['.cn-timeline-widget__title', '.cn-side-heading']) {
		it(`draws ${heading} in a side card as the 15px muted label`, () => {
			const rule = rulesFor(css, `.cn-look-board .cn-detail-page__side ${heading}`)
			expect(rule).toContain('color: var(--color-text-maxcontrast) !important')
			expect(rule).toContain('font-size: var(--cn-board-side-heading-size)')
			expect(rule).toContain('font-weight: 600')
			expect(rule).toContain('line-height: normal')
		})
	}
})
