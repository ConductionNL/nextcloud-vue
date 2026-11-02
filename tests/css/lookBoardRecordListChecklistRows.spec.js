/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTenant "Inrichten": a record-list checklist draws its rows as the board
 * does: 20px rows 8px apart, the 20px mark 10px before a 15px label, a done
 * mark the soft green with a 12px tick, the bar 12px above the rows (r44: the
 * card 198.3 vs 175, rows 36px apart vs 28). jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-record-list-checklist-rows/specs/record-list/spec.md#requirement-a-board-checklist-row-is-drawn-as-the-board
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: record-list checklist rows', () => {
	it('draws a row 20px high with the label 10px after the mark at 15px', () => {
		const row = rule('.cn-look-board .cn-record-list__check.cn-record-list__check')
		expect(row).toContain('min-height: 20px;')
		expect(row).toContain('gap: 10px;')
		expect(row).toContain('font-size: 15px;')
	})

	it('puts the bar 12px above the rows', () => {
		expect(rule('.cn-look-board .cn-record-list__checklist-bar.cn-record-list__checklist-bar')).toContain('margin-block-end: 12px;')
	})

	it('draws a done mark on the soft green with the board ink and a 12px tick', () => {
		const done = rule('.cn-look-board .cn-record-list__check--done .cn-record-list__check-mark.cn-record-list__check-mark')
		expect(done).toContain('background: var(--cn-board-success-tint);')
		expect(done).toContain('color: var(--cn-board-success-ink);')
		const tick = rule('.cn-look-board .cn-record-list__check-mark svg')
		expect(tick).toContain('width: 12px;')
		expect(tick).toContain('height: 12px;')
	})
})
