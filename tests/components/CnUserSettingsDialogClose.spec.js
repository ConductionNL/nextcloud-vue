/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The user settings dialog's close button sits in the top corner. Its scoped
 * `position: absolute` lost to NcButton's own `position: relative` at the
 * same weight, so the button stood in the body's flex row, stretched to the
 * dialog's height (34x575 on DqPersoonlijkeInstellingen). In the board look
 * it is the board's 44px round button. jsdom draws no layout, so the rules are
 * read from the source text.
 *
 * @spec openspec/changes/user-settings-close-button/specs/user-settings-close-button/spec.md#requirement-the-user-settings-close-button-sits-in-the-corner
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css.replace(/\/\*[\s\S]*?\*\//g, '')))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('CnUserSettingsDialog close button', () => {
	it('is placed absolutely with more weight than NcButton\'s own position', () => {
		const style = read('components/CnUserSettingsDialog/CnUserSettingsDialog.vue').match(/<style[^>]*>([\s\S]*?)<\/style>/)[1]
		const body = ruleFor(style, '.cn-user-settings-dialog__body > .cn-user-settings-dialog__close')
		expect(body).not.toBeNull()
		expect(body).toContain('position: absolute;')
		expect(body).toContain('top: 8px;')
		expect(body).toContain('inset-inline-end: 8px;')
	})

	it('is the board\'s 44px round button in the board look', () => {
		const body = ruleFor(read('css/dialog.css'), '.cn-look-board.cn-user-settings-dialog .cn-user-settings-dialog__close')
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: 44px;')
		expect(body).toContain('border: 0;')
		expect(body).toContain('border-radius: 22px;')
	})
})
