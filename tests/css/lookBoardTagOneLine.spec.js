/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board tag stays on one line, as every tag on the boards. Read as text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a board tag', () => {
	it('stays on one line', () => {
		const at = css.indexOf('.cn-look-board .cn-status-badge:not(.cn-look-nextcloud *) {')
		expect(css.slice(at, css.indexOf('}', at))).toContain('white-space: nowrap;')
	})
})
