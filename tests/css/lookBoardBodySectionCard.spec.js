/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A body section drawn in a card (`card: true`) reads as every board card in
 * the board look: 20px 22px in, a 12px radius, its title 17px at 700 with no
 * rule under it, and its labelled buttons at the 40px control height
 * (PqKlant and PqOrganisatie "Contactmoment registreren" and "Berichten").
 *
 * @spec openspec/changes/board-body-section-card/specs/board-body-section-card/spec.md
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The rule's selector, as written.
 * @return {string} The rule's body.
 */
function rule(selector) {
	const start = css.indexOf(selector + ' {')
	expect(start).toBeGreaterThan(-1)
	return css.slice(start, css.indexOf('}', start))
}

describe('a board body section card', () => {
	it('is padded and rounded as a board card', () => {
		const body = rule('.cn-look-board .cn-body-sections__section--card:not(.cn-look-nextcloud *)')
		expect(body).toContain('padding: var(--cn-board-card-padding);')
		expect(body).toContain('border-radius: var(--cn-board-card-radius);')
	})

	it('titles it 17px at 700 without a rule', () => {
		const body = rule('.cn-look-board .cn-body-sections__section--card > .cn-body-sections__title.cn-body-sections__title:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-size: var(--cn-board-heading-size);')
		expect(body).toContain('font-weight: 700;')
		expect(body).toContain('line-height: normal;')
		expect(body).toContain('border-bottom: 0;')
		expect(body).toContain('margin: 0 0 14px;')
		expect(body).toContain('padding: 0;')
	})

	it('sets its labelled buttons at the control height', () => {
		const body = rule('.cn-look-board .cn-body-sections__section--card .button-vue:not(.action-item__menutoggle):has(> .button-vue__wrapper > .button-vue__text:not(:empty)):where(:not(.cn-look-nextcloud *))')
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
	})
})
