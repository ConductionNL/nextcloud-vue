/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look an app's own table on the legacy `viewTable` class is
 * the board's card table, as CnRecordListWidget's `tableLook: "data"` draws
 * it (DqZaaktype): the head 14px/600 in the muted ink on the board's head
 * ground, 10px 12px, no rule under it; the cells 14px, 11px 12px, a hairline
 * above each row. The theme's bare `th` rule (ground #edeff2, weight 700) and
 * the body's 15px/1.5 drew PqService "Opbouw in stappen" 15/500 on grey,
 * 58.5px high (COMPDIFF pl6). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-view-table-head/specs/board-view-table-head/spec.md#requirement-a-board-view-table-is-the-boards-card-table
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

describe('look-board-detail.css: a legacy viewTable in the board look', () => {
	it('draws the head as the board card table head', () => {
		const body = bodyOf('.cn-look-board .viewTable th:not(.cn-look-nextcloud *)')
		expect(body).toContain('--nldesign-component-table-header-background-color: var(--cn-board-table-head-bg')
		expect(body).toContain('--nldesign-component-table-header-font-weight: 600;')
		expect(body).toContain('padding: 10px 12px;')
		expect(body).toContain('border-bottom: 0;')
		expect(body).toContain('background: var(--cn-board-table-head-bg')
		expect(body).toContain('color: var(--color-text-maxcontrast);')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 600;')
		expect(body).toContain('line-height: 1.2;')
	})

	it('draws the cells 14px under a hairline', () => {
		const body = bodyOf('.cn-look-board .viewTable td:not(.cn-look-nextcloud *)')
		expect(body).toContain('padding: 11px 12px;')
		expect(body).toContain('border-top: 1px solid var(--cn-board-hairline);')
		expect(body).toContain('border-bottom: 0;')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('line-height: 1.2;')
	})
})
