/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board table row marked overdue carries a 4px red edge on its leading side
 * (DqTaken: the tasks past or at their deadline). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-overdue-row-edge/specs/data-table/spec.md#requirement-a-board-table-row-marked-overdue-has-a-red-leading-edge
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: overdue rows', () => {
	it('draws a 4px error edge on the first cell of a row marked cn-row--overdue', () => {
		const at = css.indexOf('.cn-look-board .cn-data-table tr.cn-row--overdue > td:first-child:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('box-shadow: inset 4px 0 0 var(--color-error);')
	})
})
