/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board form's text area is three lines tall on the normal leading
 * (DqNieuweZaak Omschrijving 76px). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/form-field.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('form-field.css: board text area height', () => {
	it('draws the form text area three lines tall, without margin', () => {
		const m = css.match(/\.cn-look-board \.cn-form-dialog__field \.cn-form-dialog__textarea\s*\{([^}]*)\}/)
		expect(m).not.toBeNull()
		expect(m[1]).toContain('min-height: 0;')
		expect(m[1]).toContain('height: calc(3 * 1.2em + 22px);')
		expect(m[1]).toContain('margin: 0;')
	})
})
