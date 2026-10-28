/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The duplicate warning in a board dialog as board DqNieuweZaakDubbel draws
 * it: the warning note, the match card and the small print. Read from the
 * stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ROOT = '.cn-dialog-board .dialog__content .cn-duplicate-warning'

/**
 * The declarations of the rule that starts with a selector.
 *
 * @param {string} selector The selector text.
 * @return {string} The declarations.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

describe('dialog.css: the duplicate warning in a board dialog', () => {
	it('draws the warning note 12px 14px in at radius 8 on the status warning ground, its line 15px bold in the warning ink', () => {
		const note = rule(`${ROOT} > .notecard.notecard--warning`)
		expect(note).toMatch(/padding: 12px 14px;/)
		expect(note).toMatch(/gap: 10px;/)
		expect(note).toMatch(/border-radius: 8px;/)
		expect(note).toMatch(/background-color: var\(--nldesign-component-status-badge-warning-background-color[^;]*\) !important;/)
		expect(note).toMatch(/[^-]color: var\(--nldesign-component-status-badge-warning-color, var\(--color-warning-text\)\) !important;/)
		expect(note).toMatch(/font-size: 15px;/)
		expect(note).toMatch(/font-weight: 600;/)
		expect(note).toMatch(/line-height: normal;/)
		expect(rule(`${ROOT} > .notecard.notecard--warning p`)).toMatch(/font: inherit !important;/)
	})

	it('stacks a match card\'s lines 3px apart, 12px 14px in, the title on the normal line and the facts at 13px', () => {
		const match = rule(`${ROOT}__match`)
		expect(match).toMatch(/flex-direction: column;/)
		expect(match).toMatch(/gap: 3px;/)
		expect(match).toMatch(/padding: 12px 14px;/)
		expect(rule(`${ROOT}__title`)).toMatch(/line-height: normal;/)
		const meta = rule(`${ROOT}__meta`)
		expect(meta).toMatch(/font-size: 13px;/)
		expect(meta).toMatch(/line-height: normal;/)
	})

	it('sets the small print at 13px', () => {
		expect(rule(`${ROOT}__hint`)).toMatch(/font-size: 13px;/)
	})
})
