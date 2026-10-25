/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws the task table in a detail card (DqZaakTaken "Taken op
 * deze zaak") edge to edge: the table runs under the card's 22px side padding,
 * its first and last cells pad 22px so the text lines up with the title, the
 * head cells 10px 12px, the body cells 14px 12px, and the task name is one
 * text line instead of a 34px button.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const TABLE = '.cn-look-board .cn-detail-page .cn-widget-wrapper__content > .cn-tasks-widget .cn-tasks-widget__table'

describe('look-board-detail.css: task table in a detail card', () => {
	it('runs the table under the card\'s 22px side padding', () => {
		const body = rule(TABLE)
		expect(body).toContain('width: calc(100% + 44px)')
		expect(body).toContain('margin-inline: -22px')
	})

	it('pads head cells 10px 12px and body cells 14px 12px', () => {
		expect(rule(TABLE + ' th')).toContain('padding: 10px 12px')
		expect(rule(TABLE + ' td')).toContain('padding: 14px 12px')
	})

	it('pads the first and last cells 22px so the text lines up with the title', () => {
		expect(rule(TABLE + ' :is(th, td):first-child')).toContain('padding-inline-start: 22px')
		expect(rule(TABLE + ' :is(th, td):last-child')).toContain('padding-inline-end: 22px')
	})

	it('sets the task name as one text line', () => {
		const body = rule(TABLE + ' .cn-tasks-widget__name')
		expect(body).toContain('min-height: 0')
		expect(body).toContain('line-height: normal')
	})

	it('wraps a long task name and its line under it, so the table fits the card (r25b: 843 wide in a 798 card)', () => {
		expect(rule(TABLE + ' :is(.cn-tasks-widget__name, .cn-tasks-widget__meta)')).toContain('white-space: normal')
	})

	it('keeps a row\'s buttons on one line: the task menu stands beside Afronden, not under it', () => {
		const body = rule(TABLE + ' .cn-tasks-widget__cell-actions > *')
		expect(body).toContain('display: inline-flex')
		expect(body).toContain('vertical-align: middle')
	})
})
