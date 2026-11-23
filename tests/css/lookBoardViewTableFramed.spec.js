/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A legacy `viewTable` inside its framed `viewTableContainer` is the board's
 * framed card table, as CnDataTable `framed` draws it (PqService "Opbouw in
 * stappen", PqResource): 18px outer insets, 12px rows, a hairline under each
 * row and none under the last, where the frame closes it. COMPDIFF pl8 read
 * 12px insets and 11px rows. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-view-table-framed/specs/board-view-table-head/spec.md#requirement-a-framed-board-view-table-is-the-boards-framed-card-table
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or ''.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const T = '.cn-look-board .viewTableContainer .viewTable'

describe('look-board-detail.css: a framed legacy viewTable in the board look', () => {
	it('insets its outer cells 18px', () => {
		expect(bodyOf(`${T} :is(th, td):first-child:not(.cn-look-nextcloud *)`)).toContain('padding-inline-start: 18px;')
		expect(bodyOf(`${T} :is(th, td):last-child:not(.cn-look-nextcloud *)`)).toContain('padding-inline-end: 18px;')
	})

	it('draws 12px rows with a hairline under each but the last', () => {
		const td = bodyOf(`${T} td:not(.cn-look-nextcloud *)`)
		expect(td).toContain('padding-block: 12px;')
		expect(td).toContain('border-top: 0;')
		expect(td).toContain('border-bottom: 1px solid var(--cn-board-hairline);')
		expect(bodyOf(`${T} tbody tr:last-child td:not(.cn-look-nextcloud *)`)).toContain('border-bottom: 0;')
	})
})
