/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard card's task list and decision list rule above every row, the
 * first included, and not under the last (DqMijnWerk "Mijn taken", "Mijn
 * archiefbeoordelingen"). Read from the stylesheet.
 *
 * @spec openspec/changes/board-dashboard-lists-rule-above/specs/board-dashboard-lists-rule-above/spec.md#requirement-a-dashboard-task-or-decision-list-rules-above-every-row
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const PREFIX = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

describe('look-board: dashboard task and decision lists rule above every row', () => {
	it('draws the rule above each row and none below', () => {
		for (const row of ['.cn-tasks-widget__row', '.cn-decision-list__row']) {
			const re = /([^{}]+)\{([^{}]*)\}/g
			let body = ''
			let m
			while ((m = re.exec(css))) {
				if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(`${PREFIX} ${row}`)) {
					body = m[2]
				}
			}
			expect(body).toMatch(/border-top:\s*1px solid var\(--color-border\)/)
			expect(body).toMatch(/border-block-end:\s*0/)
		}
	})
})
