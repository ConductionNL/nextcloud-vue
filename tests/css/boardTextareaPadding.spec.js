/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board textareas keep the boards' 10px 12px padding against the Calendar
 * app's injected `textarea { padding: 5px 12px !important }` (DqOverdragen
 * reason 68 against 76). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('board textarea padding', () => {
	it('pads a board dialog textarea 10px 12px, important', () => {
		expect(read('dialog.css')).toMatch(/\.cn-dialog-board \.dialog__content \.textarea__input\s*\{[^}]*padding: 10px 12px !important;/)
	})

	it('pads a board form textarea 10px 12px, important', () => {
		expect(read('form-field.css')).toMatch(/\.cn-look-board \.cn-form-page__field textarea\s*\{[^}]*padding: 10px 12px !important;/)
	})
})
