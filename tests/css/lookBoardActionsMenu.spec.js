/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a CnActionsMenu asked for as `secondary` ("Meer",
 * "Acties") is the board's neutral control: the main background, a grey
 * border, the main text at 600 (DqZaak). NcActions keeps a class given to it
 * off its root, so the look reads the root's own `action-item--secondary`.
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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: the secondary Actions menu trigger', () => {
	const trigger = '.cn-look-board .action-item.action-item--secondary .action-item__menutoggle.button-vue--secondary:not(.cn-look-nextcloud *)'

	it('draws it neutral: main background, grey border, main text at 600', () => {
		const rule = rulesFor(trigger)
		expect(rule).toContain('background: var(--color-main-background)')
		expect(rule).toContain('border: 1px solid var(--cn-board-control-border)')
		expect(rule).toContain('color: var(--color-main-text)')
		expect(rule).toContain('font-weight: 600')
	})

	it('draws the label in the main text', () => {
		expect(rulesFor(trigger)).toMatch(/(^|[;\s])color: var\(--color-main-text\)/)
	})

	it('puts a trailing chevron after the label', () => {
		expect(rulesFor('.cn-look-board .action-item.action-item--secondary .action-item__menutoggle:has(.chevron-down-icon) .button-vue__wrapper:not(.cn-look-nextcloud *)')).toContain('flex-direction: row-reverse')
	})
})

describe('look-board.css: an open secondary Actions menu trigger', () => {
	it('keeps the main background while its menu is open, hovered or not (DqZaaktypen "Acties")', () => {
		const hover = '.cn-look-board .action-item.action-item--secondary:not(.action-item--open) .action-item__menutoggle.button-vue--secondary:not(.cn-look-nextcloud *):hover'
		expect(rulesFor(hover)).toContain('background: var(--color-background-hover)')
		expect(rulesFor('.cn-look-board .action-item.action-item--secondary .action-item__menutoggle.button-vue--secondary:not(.cn-look-nextcloud *):hover')).toBe('')
	})
})

describe('the page header hover rules: an open Actions trigger', () => {
	const fs = require('fs')
	const path = require('path')
	const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8')

	it('skips an open menu on the index header (r25b DqZaaktypen "Acties" read the hover grey)', () => {
		const css = read('look-board-index.css')
		expect(css).toContain('.cn-look-board .cn-index-page .cn-index-page__header-buttons > .action-item:not(.action-item--open) .button-vue:hover')
		expect(css).not.toContain('.cn-index-page__header-buttons > .action-item .button-vue:hover')
	})

	it('skips an open menu on the detail header', () => {
		const css = read('look-board-detail.css')
		expect(css).toContain('.cn-detail-page__header-actions .action-item--secondary:not(.action-item--open) .action-item__menutoggle:hover')
		expect(css).not.toContain('.cn-detail-page__header-actions .action-item--secondary .action-item__menutoggle:hover')
	})
})
