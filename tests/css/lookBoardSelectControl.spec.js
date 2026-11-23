/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a select outside a dialog is the board's control: a 1px
 * grey edge that meets 3:1, radius 8, 40px high (36px in a page's filter
 * row). NcSelect drew a 30px field with a 35%-transparent ring (COMPDIFF r21:
 * DqProcesanalyse "Periode", DqDoorlooptijd, DqTermijnen "Jaar",
 * DqZaakHistorie). A board dialog keeps its own field rules. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-select-control/specs/board-select-control/spec.md#requirement-a-board-select-is-the-boards-control
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies of every rule naming it, joined, or ''.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const SELECT = '.cn-look-board .v-select.select:not(.cn-look-nextcloud *):not(.cn-dialog-board *)'

describe('look-board.css: a select is the board control', () => {
	it('sizes the field 40px through the select\'s clickable area', () => {
		expect(bodyOf(SELECT)).toContain('--default-clickable-area: calc(var(--cn-board-select-height, 40px) + 4px);')
	})

	it('draws a 1px grey edge with radius 8 instead of the faint ring', () => {
		const body = bodyOf(`${SELECT} .input-field__input`)
		expect(body).toContain('border: 1px solid var(--cn-board-control-border)')
		expect(body).toContain('border-radius: var(--cn-board-control-radius)')
		expect(body).toContain('box-shadow: none')
	})

	it('makes a page filter\'s select 36px', () => {
		expect(bodyOf('.cn-look-board .cn-dashboard-page__page-filter:not(.cn-look-nextcloud *)')).toContain('--cn-board-select-height: 36px;')
	})
	// COMPDIFF r24: the period and case-type selects in a dashboard's
	// description row (DqProcesanalyse "Periode", DqDoorlooptijd "Filteren op
	// zaaktype") are 36px on the boards; live drew them 40px.
	it('makes a select in a dashboard\'s description row 36px', () => {
		expect(bodyOf('.cn-look-board .cn-dashboard-page__description:not(.cn-look-nextcloud *)')).toContain('--cn-board-select-height: 36px;')
	})

	it('makes the timeline\'s filter select 36px (DqZaakHistorie)', () => {
		expect(bodyOf('.cn-look-board .cn-timeline-manage__controls:not(.cn-look-nextcloud *)')).toContain('--cn-board-select-height: 36px;')
	})
})
