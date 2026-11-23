/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board table's cell rhythm, against the dossiq boards: an index page's
 * main table pads every cell 16px at the sides (DqZaken, DqTaken,
 * DqOrganisaties), a table in a card is the compact one, 10px 12px in the
 * header and 11px 12px in the cells (DqInstellingen, DqVthInstellingen,
 * DqZaaktype). Only the plain-title table (PqTickets, OcPublicaties) keeps
 * its 12px cells with the title 18px in. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-table-density/specs/board-table-density/spec.md#requirement-a-board-table-pads-its-cells-as-the-boards-draw-them
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list contains this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const re = new RegExp('(^|[,}\\s])' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]')
	const m = re.exec(css)
	if (!m) {
		return ''
	}
	const open = css.indexOf('{', m.index)
	return css.slice(open, css.indexOf('}', open))
}

const index = '.cn-look-board .cn-index-page__main--table .cn-table-container--board'
const plain = '.cn-look-board .cn-index-page__main--table .cn-table-container--board.cn-table-container--title-plain'
const inCard = '.cn-look-board .cn-table-container--board:not(.cn-index-page__main--table > *)'

describe('look-board-index.css: the board table density', () => {
	it('gives the 12px cells only to the plain-title table, the title column excluded', () => {
		expect(rule(`${index} .cn-data-table th:not(.cn-table-col--checkbox):not(.cn-table-col--actions):not(.cn-table-col--icon)`)).toBe('')
		const cells = rule(`${plain} .cn-data-table td:not(.cn-table-col--checkbox):not(.cn-table-col--actions):not(.cn-table-col--icon):not(.cn-table-col--title)`)
		expect(cells).toContain('padding-inline: 12px')
		expect(rule(`${plain} .cn-data-table th:not(.cn-table-col--checkbox):not(.cn-table-col--actions):not(.cn-table-col--icon):not(.cn-table-head--title)`)).toContain('padding-inline: 12px')
	})

	it('starts the plain-title table\'s title column 18px in', () => {
		expect(rule(`${plain} .cn-data-table th.cn-table-head--title`)).toContain('padding-inline: 18px 12px')
		expect(rule(`${plain} .cn-data-table td.cn-table-col--title`)).toContain('padding-inline: 18px 12px')
	})

	it('pads a table in a card 10px 12px in the header and 11px 12px in the cells', () => {
		expect(rule(`${inCard} .cn-data-table th`)).toContain('padding: 10px 12px')
		expect(rule(`${inCard} .cn-data-table td`)).toContain('padding: 11px 12px')
	})

	it('keeps the selection column of a table in a card 60px wide', () => {
		expect(rule(`${inCard} .cn-data-table .cn-table-col--checkbox`)).toContain('padding-inline: 16px')
	})

	it('lets a table in a card keep its 40px rows when a row has an actions menu (DqZaaktypeStatussen: 57px)', () => {
		expect(rule(`${inCard} .cn-data-table .cn-table-col--actions`)).toContain('padding-block: 0')
	})
})
