/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * NcNoteCard type="info" in the board look is the board's light-blue rounded
 * box (DqBesluit): no edge bar, the light primary ground, the deep primary
 * ink on the text, the icon and the paragraphs, a bold heading (thematiq sets
 * every p's weight with `!important`). NcNoteCard and
 * thematiq both use `!important`, so the board values do too, scoped to the
 * look. The icon sits on the first line, as the boards draw it (DqBerichtVersturen,
 * DqDocumentGenereren, DqZaakSamenwerken), and a dialog sets the text at 13px.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const note = '.cn-look-board .notecard.notecard--info:not(.cn-look-nextcloud *)'

describe('look-board.css: the info note', () => {
	it('is a rounded light-blue box without the edge bar', () => {
		const box = rule(note)
		expect(box).toContain('border-inline-start: 0')
		expect(box).toContain('border-radius: 10px')
		expect(box).toContain('padding: 10px 14px')
		expect(box).toContain('background-color: var(--color-primary-element-light) !important')
	})

	it('writes text, paragraphs and icon in the deep primary ink, also for a forcing theme', () => {
		expect(rule(note)).toContain('color: var(--color-primary-element-light-text) !important')
		expect(rule(note)).toContain('--nldesign-color-on-surface: var(--color-primary-element-light-text)')
		expect(rule(`${note} p`)).toContain('color: var(--color-primary-element-light-text) !important')
		expect(rule(`${note} .notecard__icon`)).toContain('color: var(--color-primary-element-light-text)')
	})

	it('sets the heading bold at the text size', () => {
		const heading = rule(`${note} .notecard__heading`)
		expect(heading).toContain('font-weight: 700 !important')
		expect(heading).toContain('font-size: inherit')
	})

	it('sets the 18px icon on the first line, not centred on the note', () => {
		expect(rule(`${note} .notecard__icon`)).toContain('align-self: flex-start')
		const svg = rule(`${note} .notecard__icon svg`)
		expect(svg).toContain('width: 18px')
		expect(svg).toContain('height: 18px')
	})

	it('sets the text at 13px in a board dialog', () => {
		expect(rule('.cn-look-board.cn-dialog-board .notecard.notecard--info:not(.cn-look-nextcloud *)')).toContain('font-size: 13px')
	})

	it('only reaches the board look', () => {
		const selectors = css.match(/[^{}]*notecard--info[^{}]*\{/g) || []
		expect(selectors.length).toBeGreaterThan(0)
		for (const s of selectors) {
			expect(s.trim().startsWith('.cn-look-board')).toBe(true)
		}
	})
})

describe('look-board.css: a record list notice', () => {
	it('sets its icon on the first line, not centred on the notice', () => {
		expect(rule('.cn-look-board .cn-record-list__notice .cn-record-list__notice-icon')).toContain('align-self: flex-start')
	})
})
