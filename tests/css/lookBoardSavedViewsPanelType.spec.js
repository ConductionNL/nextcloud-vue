/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The saved-views panel's words in the board look (DqFilterBeheren): a group
 * heading ("Mijn weergaven") at 15px/700 in the main ink, the group's note and
 * a view's description at 13px in the muted ink, the description not bold.
 * Read from the stylesheet text; the Dutch heading reads "Gedeeld met mij" as
 * the share dialog says it.
 *
 * @spec openspec/changes/board-saved-views-panel-type/specs/board-saved-views-panel-type/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const nl = require('../../l10n/nl.json').translations

/** The declarations of the board rule for one panel part. */
function rule(part) {
	const at = css.indexOf(`.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *) .cn-saved-views-panel__${part} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: saved-views panel type', () => {
	it('draws a group heading at 15px/700 in the main ink', () => {
		const body = rule('section')
		expect(body).toMatch(/font-size: 15px;/)
		expect(body).toMatch(/font-weight: 700;/)
		expect(body).toMatch(/color: var\(--color-main-text\);/)
	})

	it.each(['note', 'subline'])('draws the %s at 13px/400 in the muted ink', (part) => {
		const body = rule(part)
		expect(body).toMatch(/font-size: 13px;/)
		expect(body).toMatch(/font-weight: 400;/)
		expect(body).toMatch(/color: var\(--color-text-maxcontrast\);/)
	})

	it('names the shared group as the share dialog does', () => {
		expect(nl['Shared with me']).toBe('Gedeeld met mij')
	})
})
