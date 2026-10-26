/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisaties: an unsortable head label wraps beside its funnel. Read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-head-label-beside-funnel/specs/data-table/spec.md#requirement-a-board-heads-plain-label-wraps-beside-its-filter
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: plain head label beside its funnel', () => {
	it('keeps the funnel\'s room beside the label', () => {
		const selector = '.cn-look-board .cn-index-page__main--table .cn-table-container--board .cn-data-table th > span:first-child:has(~ .cn-table-header__filter) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('display: inline-block;')
		expect(body).toContain('max-width: calc(100% - 26px);')
	})
})
