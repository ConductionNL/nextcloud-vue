/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dialog's round close button draws its cross in the soft ink
 * (#3d4047 on every dialog board: DqNieuweZaak, PqNieuwVerzoek,
 * PqNieuwsbriefWizard), not in the primary colour a tertiary NcButton takes.
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

describe('board dialog close button', () => {
	const rule = ruleOf('.cn-dialog-header .cn-dialog-header__close.button-vue')

	it('draws the cross in the soft ink', () => {
		expect(rule).toMatch(/color:\s*var\(--cn-board-text-soft,\s*var\(--color-text-maxcontrast\)\);/)
	})

	it('hands the soft ink to the nldesign button text token', () => {
		expect(rule).toMatch(/--nldesign-color-on-surface:\s*var\(--cn-board-text-soft,\s*var\(--color-text-maxcontrast\)\);/)
	})

	it('keeps the transparent ground', () => {
		expect(rule).toMatch(/background:\s*transparent;/)
	})
})
