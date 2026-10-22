/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The bulk band ("Met de geselecteerde zaken") sets its text at the font's
 * normal line height and keeps 6px after its lead before the buttons, as the
 * index boards draw it (DqZaken, DqZakenSorteren, DqFilterBeheren,
 * DqFilterInMenu). jsdom draws no layout, so the rules are read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-bulk-band-leading/specs/board-bulk-band-leading/spec.md#requirement-the-bulk-band-sets-its-lead-as-the-boards-do
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board-index.css: the bulk band', () => {
	it('sets its text at the normal line height', () => {
		expect(bodyOf('.cn-look-board .cn-actions-bar__band:not(.cn-look-nextcloud *)')).toContain('line-height: normal;')
	})

	it('keeps 6px after the lead', () => {
		expect(bodyOf('.cn-look-board .cn-actions-bar__band .cn-actions-bar__band-lead:not(.cn-look-nextcloud *)')).toContain('margin-inline-end: 6px;')
	})

	/**
	 * @spec openspec/changes/board-bulk-band-no-hint/specs/board-bulk-band-no-hint/spec.md#requirement-the-board-bulk-band-draws-no-hint-line
	 */
	it('draws no hint line', () => {
		expect(bodyOf('.cn-look-board .cn-actions-bar__band .cn-actions-bar__band-hint:not(.cn-look-nextcloud *)')).toContain('display: none;')
	})
})
