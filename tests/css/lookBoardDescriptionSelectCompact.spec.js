/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a select on a dashboard description line is compact,
 * 190px (DqProcesanalyse: NcSelect's 260px minimum wrapped "Alle
 * zaaktypen" onto a line of its own). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-description-select-compact/specs/board-description-select-compact/spec.md#requirement-a-description-select-is-as-wide-as-its-choice
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a description select', () => {
	it('drops NcSelect\'s minimum width', () => {
		const selector = '.cn-look-board .cn-dashboard-page__description:not(.cn-look-nextcloud *) .v-select.select.cn-dashboard-page__description-select {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('min-width: 0;')
		expect(body).toContain('width: 190px;')
	})

	it('lets the choice run to the chevron while no clear button shows', () => {
		const selector = ".cn-dashboard-page__description-select:has(.vs__clear[style*='display: none']) .vs__selected {"
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-inline-end: 44px;')
	})
})
