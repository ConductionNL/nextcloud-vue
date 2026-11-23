/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A short side list on a detail page (`density: "stacked"`) in the board
 * look, as DqOrganisatie draws "Lopende zaken" and "Open tickets": each row's
 * title is a link, bold, in the link colour and underlined. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-main-contact-lines/specs/parties/spec.md#requirement-a-stacked-side-lists-rows-are-titled-as-links-in-the-board-look
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: stacked side list titles', () => {
	it('draws the row title bold, in the link colour, underlined', () => {
		const selector = '.cn-look-board .cn-detail-page__side .cn-record-list--stacked.cn-record-list--rows:not(.cn-look-nextcloud *) .cn-record-list__title {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('color: var(--color-primary-element)')
		expect(body).toContain('font-weight: 700')
		expect(body).toContain('text-decoration: underline')
	})
})
