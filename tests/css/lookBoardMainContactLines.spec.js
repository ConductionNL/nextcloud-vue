/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The parties widget's main contact card in the board look, as DqOrganisatie
 * draws Hoofdcontact: the e-mail and the "Alle 2 contactpersonen" link are
 * 14px lines under the 15px name. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-main-contact-lines/specs/parties/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: the main contact card', () => {
	it('sets the e-mail and the link to all contact persons at 14px', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page__side .cn-object-parties__main-link {')
		expect(at).toBeGreaterThan(-1)
		const head = css.lastIndexOf('}', at)
		const body = css.slice(head, css.indexOf('}', at))
		expect(body).toContain('.cn-look-board .cn-detail-page__side .cn-object-parties__main-email,')
		expect(body).toContain('font-size: 14px')
	})
})
