/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakArchivering r36 (Bewaring y +7.4): the open record's note sat 15px
 * under the facts and 15px over the next title at 14px/21 (714.4/62, board
 * 709/59), and a section's rows 4px under its title where the board leaves 10.
 *
 * @spec openspec/changes/board-retention-pending-note/specs/board-retention-card/spec.md
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnRetentionWidget/CnRetentionWidget.vue'), 'utf8')

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

describe('the archiving card in the board look (r36)', () => {
	it('names the open record\'s block', () => {
		expect(sfc).toContain('class="cn-retention__pending"')
	})

	it('sets the note 10px under the facts, 13px at 1.5, 10px 14px in', () => {
		const note = bodyOf('.cn-look-board .cn-retention .cn-retention__pending > .notecard')
		expect(note).toContain('margin: 10px 0 0;')
		expect(note).toContain('padding: 10px 14px;')
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__pending > .notecard *')).toContain('font-size: 13px;')
	})

	it('sets a section title 6px down and its rows 10px under it', () => {
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__section > .cn-inner-heading')).toContain('margin: 6px 0 0;')
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__section')).toContain('gap: 10px;')
	})
})
