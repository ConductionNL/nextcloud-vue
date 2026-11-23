/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqDagAfsluiten "Klaar voor vandaag?": the card holding the placed closing
 * pair draws its title, sentence and pair 24px from its edge, and the pair's
 * band is ruled across the card, 14px above and below the buttons (r36:
 * Annuleren 1px from the card edge, the band 21px past both edges, no room
 * under the buttons). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-close-day-card-insets/specs/board-close-day-card-insets/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const page = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: the close-day card', () => {
	it('rules the placed pair across the card, 14px above and below the buttons, 24px in', () => {
		const band = rule(page + ' .cn-record-notes__all.cn-record-notes__all--placed')
		expect(band).toContain('margin: 0;')
		expect(band).toContain('padding: 14px 23px;')
		expect(band).toContain('border-top: 1px solid var(--color-border);')
	})

	it('sets the card that holds the pair at 24px insets', () => {
		expect(rule(page + ' .cn-widget-wrapper:has(> .cn-widget-wrapper__content > .cn-record-notes__all--placed)')).toContain('--cn-board-dashboard-card-inset: 24px;')
	})
})
