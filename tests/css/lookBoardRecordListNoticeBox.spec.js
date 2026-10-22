/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a record list's notice is the board's note box: 10px
 * 14px of padding and radius 10, as the boards draw their 17 notes
 * (DqZaaktypeOverzicht; COMPDIFF r21 inset top 11 vs 14). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-record-list-notice-box/specs/board-record-list-notice-box/spec.md#requirement-a-board-record-list-notice-is-the-boards-note-box
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a record list notice', () => {
	it('is padded 10px 14px with radius 10', () => {
		const at = css.indexOf('.cn-look-board .cn-record-list__notice:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('padding: 10px 14px;')
		expect(body).toContain('border-radius: 10px;')
	})
})
