/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board admin settings header keeps the board's rhythm (DqInstellingen):
 * 4px under the content's top, a 40px title row, 14px crumbs 6px under it,
 * 8px under them, and no bottom margin on top of the shell grid's gap.
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-admin-settings-header-rhythm/specs/board-admin-settings-header-rhythm/spec.md#requirement-the-board-admin-settings-header-keeps-the-boards-rhythm
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board.css: the admin settings header rhythm', () => {
	it('drops the header\'s own bottom margin inside the shell grid and pads it 4px 0 8px', () => {
		const body = bodyOf('.cn-look-board .cn-admin-settings-shell:not(.cn-look-nextcloud *) > .cn-admin-settings-shell__header')
		expect(body).toContain('margin-bottom: 0;')
		expect(body).toContain('padding: 4px 0 8px;')
	})

	it('gives the title the 40px row of the header buttons', () => {
		expect(bodyOf('.cn-look-board .cn-admin-settings-shell__title:not(.cn-look-nextcloud *)')).toContain('min-height: var(--cn-board-control-height);')
	})

	it('sets the crumbs at 14px on a normal line', () => {
		const body = bodyOf('.cn-look-board .cn-admin-settings-shell__crumbs:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('line-height: normal;')
	})
})
