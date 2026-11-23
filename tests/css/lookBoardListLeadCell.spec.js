/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board list row's leading cell ("6 dagen", DqTeamwachtrij) is 14px at
 * weight 700 on the normal line height. jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 *
 * @spec openspec/changes/board-list-lead-cell/specs/board-list-lead-cell/spec.md#requirement-a-board-list-rows-leading-cell-is-14px-bold
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-index.css: the list lead cell', () => {
	it('is 14px bold on the normal line height', () => {
		const body = bodyOf('.cn-look-board .cn-object-row__lead:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 700;')
		expect(body).toContain('line-height: normal;')
	})

	it('keeps an age widget in it at 700', () => {
		expect(bodyOf('.cn-look-board .cn-object-row__lead .cn-cell-renderer__age:not(.cn-look-nextcloud *)')).toContain('font-weight: 700;')
	})
})
