/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakTaken r36 (task table rows 79.4 vs 82): under a task's name the board
 * draws its meta line at 13px on the normal line, 2px under the name; live
 * drew it 12px at 1.2 right under the name.
 *
 * @spec openspec/changes/board-task-table-meta/specs/record-task-table/spec.md
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body.
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

describe('the task table meta line in the board look', () => {
	it('is 13px on the normal line, 2px under the name', () => {
		const meta = bodyOf('.cn-look-board .cn-detail-page .cn-widget-wrapper__content > .cn-tasks-widget .cn-tasks-widget__table .cn-tasks-widget__cell-task .cn-tasks-widget__meta')
		expect(meta).toContain('font-size: 13px;')
		expect(meta).toContain('line-height: normal;')
		expect(meta).toContain('margin-top: 2px;')
	})
})
