/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The linked mail list in the board look reads as DqZaakEmail draws it (r34:
 * the "SV" tile 40px/16px for 32px/12px, rows 45px for 60-75px, the subject
 * an underlined primary link). Read from the stylesheet.
 *
 * @spec openspec/changes/board-linked-mail-rows/specs/board-linked-mail-rows/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
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

const G = ':not(.cn-look-nextcloud *)'

describe('the board look\'s linked mail rows', () => {
	it('stands each mail under a hairline, 12px above and below', () => {
		const item = bodyOf(`.cn-look-board .cn-email-tab__item${G}`)
		expect(item).toMatch(/display:\s*flex/)
		expect(item).toMatch(/padding:\s*12px 0/)
		expect(item).toMatch(/border-top:\s*1px solid var\(--cn-board-hairline\)/)
	})

	it('draws the row link without the theme\'s link colour and underline', () => {
		const row = bodyOf(`.cn-look-board .cn-email-tab__row${G}`)
		expect(row).toMatch(/gap:\s*12px/)
		expect(row).toMatch(/padding:\s*0/)
		expect(row).toMatch(/color:\s*var\(--color-main-text\)\s*!important/)
		expect(row).toMatch(/text-decoration:\s*none\s*!important/)
	})

	it('draws the initials as a 32px grey tile, 12px bold in the soft ink', () => {
		const tile = bodyOf(`.cn-look-board .cn-email-tab__avatar${G}`)
		expect(tile).toMatch(/width:\s*32px\s*!important/)
		expect(tile).toMatch(/height:\s*32px\s*!important/)
		expect(bodyOf(`.cn-look-board .cn-email-tab__avatar${G} .avatardiv__initials-wrapper`)).toMatch(/background-color:\s*var\(--color-background-hover\)\s*!important/)
		const initials = bodyOf(`.cn-look-board .cn-email-tab__avatar${G} .avatardiv__initials`)
		expect(initials).toMatch(/color:\s*var\(--cn-board-text-soft\)\s*!important/)
		expect(initials).toMatch(/font-size:\s*12px/)
		expect(initials).toMatch(/font-weight:\s*700/)
	})

	it('sets the subject 15px/600 over the sender in 13px muted, 2px apart', () => {
		const subject = bodyOf(`.cn-look-board .cn-email-tab__subject${G}`)
		expect(subject).toMatch(/font-size:\s*15px/)
		expect(subject).toMatch(/font-weight:\s*600/)
		const sender = bodyOf(`.cn-look-board .cn-email-tab__sender${G}`)
		expect(sender).toMatch(/margin-top:\s*2px/)
		expect(sender).toMatch(/font-size:\s*13px/)
	})

	it('draws the row\'s more-actions button as a 34px bordered square', () => {
		const more = bodyOf(`.cn-look-board .cn-email-tab__menu${G} .action-item__menutoggle`)
		expect(more).toMatch(/--button-size:\s*34px/)
		expect(more).toMatch(/border:\s*1px solid var\(--cn-board-control-border\)/)
		expect(more).toMatch(/border-radius:\s*8px/)
	})
})
