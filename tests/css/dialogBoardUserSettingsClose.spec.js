/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The user settings dialog's close button is a 44px round button in the board
 * look, as DqPersoonlijkeInstellingen draws it; live drew NcButton's 34px with
 * radius 8 (COMPDIFF r24). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-user-settings-close-round/specs/board-user-settings-close-round/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('dialog.css: the user settings dialog close button', () => {
	it('is a 44px round button in the board dialog', () => {
		const selector = '.modal-mask.cn-dialog-board.cn-user-settings-dialog .cn-user-settings-dialog__close.button-vue {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('--button-size: 44px;')
		expect(body).toContain('--button-radius: 22px;')
		expect(body).toContain('--button-padding: 0;')
		expect(body).toContain('border-radius: 22px;')
	})
})
