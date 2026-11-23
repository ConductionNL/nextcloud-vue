/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a page root draws no ground of its own, so the content
 * area's ground shows behind the cards, also where a theme paints every
 * `[class*="panel"]` with an id-weighted rule. jsdom draws no layout, so the
 * rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-page-ground/specs/board-page-ground/spec.md#requirement-a-board-page-draws-no-ground-of-its-own
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

describe('look-board.css: the page ground', () => {
	it.each([
		'.cn-index-page',
		'.cn-detail-page',
		'.cn-dashboard-page',
		'.cn-settings-page',
		'.cn-store-page',
		'.cn-admin-settings-shell',
	])('%s draws no ground, with an id in :not() to outrank a theme rule that carries one', (page) => {
		expect(bodyOf(`.cn-look-board ${page}:not(#cn-board-page-ground):not(.cn-look-nextcloud *)`)).toContain('background-color: transparent;')
	})
})
