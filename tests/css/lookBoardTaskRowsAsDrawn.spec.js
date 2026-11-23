/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board task list with the subject/due line wraps titles and subjects at the
 * board's leading and pads 20px under the list (r33 DqMijnWerk Mijn taken 447
 * vs 555). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: board task rows', () => {
	it('wraps the title and the subject', () => {
		expect(rule('.cn-look-board .cn-tasks-widget__row:has(.cn-tasks-widget__meta--split) .cn-tasks-widget__name')).toContain('white-space: normal;')
		expect(rule('.cn-look-board .cn-tasks-widget__meta--split .cn-tasks-widget__subject')).toContain('white-space: normal;')
	})

	it('sets the line 4px under the title at normal leading and pads 20px under the list', () => {
		expect(rule('.cn-look-board .cn-tasks-widget__row:has(.cn-tasks-widget__meta--split) .cn-tasks-widget__body')).toContain('gap: 4px;')
		expect(rule('.cn-look-board .cn-tasks-widget__meta--split')).toContain('line-height: normal;')
		expect(rule('.cn-look-board .cn-tasks-widget--list:has(.cn-tasks-widget__meta--split)')).toContain('padding-bottom: 20px;')
	})
})
