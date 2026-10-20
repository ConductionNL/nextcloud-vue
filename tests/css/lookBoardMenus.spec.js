/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An NcActions menu opens in a popover on <body>, outside the board-look
 * root, so the board menu keys on a body that holds one (DqZaakMeer "Meer").
 * Read from the stylesheet text.
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

const popper = 'body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .v-popper__popper.action-item__popper'

describe('look-board.css: the board menu', () => {
	it('draws the menu as a card: 6px in, a hairline, a 10px radius and a drop shadow', () => {
		const rule = rulesFor(`${popper} .v-popper__wrapper .v-popper__inner`)
		expect(rule).toContain('padding: 6px')
		expect(rule).toContain('border: 1px solid var(--color-border)')
		expect(rule).toContain('border-radius: 10px')
		expect(rule).toContain('box-shadow: 0 12px 32px')
	})

	it('outweighs NcActions\' own popover rule (five classes)', () => {
		const selector = `${popper} .v-popper__wrapper .v-popper__inner`
		const classes = (selector.match(/\.[a-z_-]+/gi) || []).length
		expect(classes).toBeGreaterThanOrEqual(5)
	})

	it('draws a row 36px high, 10px in, 6px rounded, 14px text at 400, under a theme too', () => {
		const rule = rulesFor(`${popper} li.action > .action-button`)
		expect(rule).toContain('min-height: 36px')
		expect(rule).toContain('padding: 0 10px')
		expect(rule).toContain('border-radius: 6px')
		expect(rule).toContain('font-size: 14px')
		expect(rule).toContain('font-weight: 400')
		expect(rule).toContain('--font-weight-element: 400')
		expect(rule).toContain('--nldesign-component-button-font-weight: 400')
		expect(rule).toContain('--nldesign-component-button-border-radius: 6px')
		expect(rulesFor(`${popper} li.action > .action-link`)).toBe(rule)
	})

	it('draws an 18px icon 10px before the label', () => {
		expect(rulesFor(`${popper} li.action > .action-button`)).toContain('gap: 10px')
		const icon = rulesFor(`${popper} li.action > .action-button > .material-design-icon`)
		expect(icon).toContain('width: 18px')
		expect(icon).toContain('height: 18px')
		expect(icon).toContain('align-self: center')
	})

	it('keeps a long label on one line instead of NcActionButton\'s 220px', () => {
		const rule = rulesFor(`${popper} li.action .action-button__longtext`)
		expect(rule).toContain('max-width: none')
		expect(rule).toContain('padding: 0')
	})

	it('draws a group caption in 12px bold capitals, 10px in', () => {
		const rule = rulesFor(`${popper} li.app-navigation-caption`)
		expect(rule).toContain('padding: 6px 10px 2px')
		expect(rule).toContain('font-size: 12px')
		expect(rule).toContain('font-weight: 700')
		expect(rule).toContain('text-transform: uppercase')
		expect(rule).toContain('margin: 0')
	})

	it('gives a detail page\'s header menu the board width', () => {
		const rule = rulesFor(`${popper}:has([data-testid^="cn-detail-page-"]) .v-popper__wrapper .v-popper__inner`)
		expect(rule).toContain('width: 344px')
		expect(rule).toContain('box-sizing: border-box')
	})

	it('leaves the Nextcloud look alone: every menu rule needs a board-look root', () => {
		const selectors = css.match(/[^{}]+(?=\{)/g).join(',').split(',').map((s) => s.trim())
		const menu = selectors.filter((s) => s.includes('action-item__popper'))
		expect(menu.length).toBeGreaterThan(0)
		menu.forEach((s) => expect(s.startsWith('body:has(.cn-look-board):not(:has(.cn-look-nextcloud))')).toBe(true))
	})
})
