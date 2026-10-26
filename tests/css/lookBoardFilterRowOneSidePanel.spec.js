/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * With the side panel open the boards keep Filter on row 1, after Weergave
 * opslaan, and wrap the view switch alone to row 2 (DqFilterBeheren,
 * DqFilterInMenu, DqZakenSorteren). The Filter + switch unit wrapped as one,
 * so Filter left row 1 (r29). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-filter-row-one-beside-side-panel/specs/board-filter-row-one-beside-side-panel/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: Filter beside the side panel', () => {
	it('dissolves the Filter + switch unit while the side panel is open', () => {
		const at = css.indexOf('.cn-look-board .cn-index-page--sidebar-open .cn-actions-bar--board .cn-actions-bar__view-controls')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/display: contents;/)
	})
})
