/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktype "Fasen en taken": the phases are one titled card with its
 * subtitle, the phase groups sunken inside it. r25b on :8080 drew the
 * grouped cards bare on the page, without the title, subtitle or card.
 *
 * @spec openspec/changes/grouped-cards-titled-card/specs/grouped-cards/spec.md
 */
const fs = require('fs')
const path = require('path')
const { isContentOnlyWidgetDef } = require('../../src/utils/widgetDispatch.js')

describe('grouped cards on a detail card surface', () => {
	it('is content only, so the host draws its titled card', () => {
		expect(isContentOnlyWidgetDef({ type: 'grouped-cards' })).toBe(true)
	})

	it('draws a card\'s actions beside its title and meta in the board look', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8')
		expect(css).toMatch(/\.cn-grouped-cards__item\.cn-grouped-cards__item:has\(> \.cn-grouped-cards__item-actions\)[^{]*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/)
	})
})
