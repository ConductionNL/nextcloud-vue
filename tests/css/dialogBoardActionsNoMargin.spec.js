/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog's footer carries no margin, also where NcDialog's scoped
 * rule loads later (DqVolgendeStap: the footer stood 6px low, r30).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dialog-actions-no-margin/specs/dialog/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('dialog.css: the board dialog footer', () => {
	it('outranks NcDialog scoped margin', () => {
		expect(rule('.cn-dialog-board .dialog .dialog__actions')).toContain('margin: 0')
	})
})
