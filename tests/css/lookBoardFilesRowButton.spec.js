/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/board-files-row-button/specs/board-files-row-button/spec.md#requirement-the-row-button-is-the-boards-compact-control
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const BUTTON = '.cn-look-board .cn-files-browser__col-actions > .cn-files-browser__row-button'

/**
 * The declarations of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].trim() === selector) {
			return m[2]
		}
	}
	return ''
}

describe('the files row button in the board look', () => {
	it('is 13px, 10px in', () => {
		expect(bodyOf(`${BUTTON}:not(.cn-look-nextcloud *)`)).toContain('padding-inline: 10px;')
		expect(bodyOf(`${BUTTON}:not(.cn-look-nextcloud *) .button-vue__text`)).toContain('font-size: 13px;')
	})

	it('stands 6px before a 28px menu', () => {
		const menu = `${BUTTON} + .cn-files-browser__row-menu:not(.cn-look-nextcloud *)`
		expect(bodyOf(menu)).toContain('margin-inline-start: 6px;')
		expect(bodyOf(`${menu} .button-vue`)).toContain('width: 28px;')
	})
})
