/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The saved-views panel's vertical rhythm in the board look, as
 * DqFilterBeheren draws it: the panel 2px lower, 8px between Save view and
 * its note, the note at the normal line height, 22px above a group heading
 * whose row is 22px tall, 6px under it, and 2px between the rows of a group.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-saved-views-panel-rhythm/specs/board-saved-views-panel-rhythm/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const PANEL = '.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *)'

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: saved-views panel rhythm', () => {
	it('puts 6px between the panel parts and the panel 2px lower', () => {
		expect(body(PANEL)).toMatch(/gap: 6px;/)
		expect(body(PANEL)).toMatch(/padding-top: 2px;/)
	})

	it('puts 8px between Save view and its note, the note at the normal line height', () => {
		expect(body(`${PANEL} .cn-saved-views-panel__head`)).toMatch(/gap: 8px;/)
		expect(body(`${PANEL} .cn-saved-views-panel__note`)).toMatch(/line-height: normal;/)
	})

	it('gives a group heading 16px above and a 22px row', () => {
		expect(body(`${PANEL} .cn-saved-views-panel__section`)).toMatch(/margin: 16px 0 0;/)
		expect(body(`${PANEL} .cn-saved-views-panel__section`)).toMatch(/padding-bottom: 4px;/)
	})

	it('puts 2px between the rows of a group', () => {
		expect(body(`${PANEL} .cn-saved-views-panel__list`)).toMatch(/gap: 2px;/)
	})
})
