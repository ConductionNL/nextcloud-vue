/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * r34 DQ-L7 card rhythm in the board look, read from the stylesheet text:
 * DqSociaalDomein "De melding" (three-column facts keep their rule),
 * DqOrganisatie "Lopende zaken" / "Open tickets" (stacked side rows) and
 * "Hoofdcontact" (main contact lines), DqTaak "Afspraken" (appointment rows)
 * and "Zaak" (a title and its lines as one block).
 *
 * @spec openspec/changes/board-card-rhythm-r34/specs/board-card-rhythm-r34/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule whose selector list holds the given selector.
 *
 * @param {string} selector One selector of the list.
 * @return {string} The rule bodies joined, or ''.
 */
function rulesHolding(selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]', 'g')
	let out = ''
	let m
	while ((m = re.exec(css)) !== null) {
		const open = css.indexOf('{', m.index)
		out += css.slice(open, css.indexOf('}', open))
	}
	return out
}

describe('look-board-detail.css: r34 card rhythm', () => {
	it('rules three-column facts: 3px label gap, 10px and a hairline under each, value 500', () => {
		const row = rulesHolding('.cn-look-board .cn-facts-widget__rows--columns.cn-facts-widget__rows--three:not(.cn-look-nextcloud *) .cn-facts-widget__row')
		expect(row).toMatch(/gap: 3px;/)
		expect(row).toMatch(/padding-bottom: 10px;/)
		expect(row).toMatch(/border-bottom: 1px solid var\(--cn-board-hairline\);/)
		expect(rulesHolding('.cn-look-board .cn-facts-widget__rows--columns.cn-facts-widget__rows--three:not(.cn-look-nextcloud *) .cn-facts-widget__value.cn-facts-widget__value')).toMatch(/font-weight: 500;/)
	})

	it('sets a side stacked row 10px between its text and pill, 4px between title and meta', () => {
		expect(rulesHolding('.cn-look-board .cn-detail-page__side .cn-record-list--stacked.cn-record-list--rows:not(.cn-look-nextcloud *) .cn-record-list__row:not(.cn-record-list__row--action)')).toMatch(/gap: 10px;/)
		expect(rulesHolding('.cn-look-board .cn-detail-page__side .cn-record-list--stacked.cn-record-list--rows:not(.cn-look-nextcloud *) .cn-record-list__main')).toMatch(/gap: 4px;/)
	})

	it('sets the main contact lines at normal leading and the e-mail in the ink', () => {
		expect(rulesHolding('.cn-look-board .cn-detail-page__side .cn-object-parties__main-email')).toMatch(/line-height: normal;/)
		expect(rulesHolding('.cn-look-board .cn-detail-page__side .cn-object-parties__main-link')).toMatch(/line-height: normal;/)
		const email = rulesHolding('.cn-look-board .cn-detail-page__side .cn-object-parties__main-email:not(.cn-look-nextcloud *):not(:hover):not(:focus-visible)')
		expect(email).toMatch(/color: var\(--color-main-text\);/)
		expect(email).toMatch(/text-decoration: none;/)
	})

	it('sets the appointment meta at normal leading and the list 8px under the title', () => {
		expect(rulesHolding('.cn-look-board .cn-events-card__when:not(.cn-look-nextcloud *)')).toMatch(/line-height: normal;/)
		expect(rulesHolding('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-events-card):not(.cn-detail-page__side *)')).toMatch(/padding-top: 8px;/)
	})

	it('draws a side title and the lines under it 2px apart', () => {
		expect(rulesHolding('.cn-look-board .cn-detail-page__side .cn-facts-widget__title:not(.cn-look-nextcloud *) + .cn-facts-widget__line')).toMatch(/margin-top: -8px;/)
	})
})
