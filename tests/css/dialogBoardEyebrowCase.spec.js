/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dialog's eyebrow is sentence case, as drawn (DqNieuweZaak): no
 * capitals and no caps tracking. `--cn-dialog-eyebrow-transform: uppercase`
 * brings the capitals back.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The exact selector.
 * @return {string} The declarations of its rule.
 */
function ruleOf(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = css.match(new RegExp('(^|\\n)' + escaped + '\\s*\\{([^}]*)\\}'))
	return match ? match[2] : ''
}

describe('board dialog eyebrow', () => {
	it('defaults the board eyebrow to sentence case', () => {
		expect(ruleOf('.cn-dialog-board')).toMatch(/--cn-dialog-eyebrow-transform:\s*none;/)
	})

	it('drops the caps tracking on the board', () => {
		expect(ruleOf('.cn-dialog-board')).toMatch(/--cn-dialog-eyebrow-tracking:\s*0;/)
		expect(ruleOf('.cn-dialog-header__eyebrow')).toMatch(/letter-spacing:\s*var\(--cn-dialog-eyebrow-tracking,\s*0\.06em\);/)
	})

	it('still reads the transform hook', () => {
		expect(ruleOf('.cn-dialog-header__eyebrow')).toMatch(/text-transform:\s*var\(--cn-dialog-eyebrow-transform,\s*uppercase\);/)
	})
})
