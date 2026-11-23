/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `framed` draws a CnDataTable placed straight in a card as the boards'
 * framed card table (PqKassa "Aankoopgeschiedenis" and payments,
 * PqKassaRetour lines, PqLoyaliteit): a 1px frame with an 8px radius, 18px
 * outer cell insets and 12px row padding, a rule under the head and under
 * every row but the last. Dossiq's card tables have no frame, so it is an opt-in.
 *
 * @spec openspec/changes/data-table-framed/specs/data-table-framed/spec.md#requirement-a-data-table-in-a-card-can-be-framed
 */
const { shallowMount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const FRAMED = '.cn-look-board .cn-table-container--board.cn-table-container--framed'

/**
 * The declarations of the rule whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The block, or '' when there is none.
 */
function block(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = css.match(new RegExp('(^|\\}|,)\\s*' + escaped + '\\s*(,[^{]*)?\\{([^}]*)\\}'))
	return match ? match[3] : ''
}

const mountTable = (props) => shallowMount(CnDataTable, { props: { columns: [{ key: 'a', label: 'A' }], rows: [{ id: 1, a: 'x' }], ...props } })

describe('CnDataTable framed', () => {
	it('marks the container framed only when asked', () => {
		expect(mountTable({ framed: true }).classes()).toContain('cn-table-container--framed')
		expect(mountTable({}).classes()).not.toContain('cn-table-container--framed')
	})

	it('draws the frame in the board look', () => {
		const frame = block(FRAMED)
		expect(frame).toContain('border: 1px solid var(--color-border)')
		expect(frame).toContain('border-radius: 8px')
	})

	it('insets the outer cells 18px and pads the rows 12px, ruled under the head and each row but the last', () => {
		expect(block(FRAMED + ' .cn-data-table :is(th, td):first-child')).toContain('padding-inline-start: 18px')
		expect(block(FRAMED + ' .cn-data-table :is(th, td):last-child')).toContain('padding-inline-end: 18px')
		expect(block(FRAMED + ' .cn-data-table th')).toContain('border-bottom: 1px solid var(--cn-board-hairline)')
		const td = block(FRAMED + ' .cn-data-table td')
		expect(td).toContain('padding-block: 12px')
		expect(td).toContain('border-top: 0')
		expect(td).toContain('border-bottom: 1px solid var(--cn-board-hairline)')
		expect(block(FRAMED + ' .cn-data-table tbody tr:last-child td')).toContain('border-bottom: 0')
	})
})
