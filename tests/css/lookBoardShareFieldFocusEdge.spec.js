/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The share field (DqFilterDelen) follows the one focus rule of every field:
 * the search input keeps its own 1px primary edge and the theme's focus
 * rings, and the toggle draws no ring of its own. jsdom draws no layout, so
 * the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-share-field-focus-edge/specs/board-share-field-focus-edge/spec.md#requirement-the-share-field-keeps-the-field-focus-edge
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Every selector in the stylesheet.
 *
 * @return {string[]} The selectors, trimmed.
 */
function selectors() {
	const out = []
	const re = /([^{}]+)\{[^{}]*\}/g
	let m
	while ((m = re.exec(css))) {
		out.push(...m[1].split(/,(?![^(]*\))/).map((s) => s.trim()))
	}
	return out
}

const TOGGLE = '.cn-look-board .cn-saved-view-share__search:not(.cn-look-nextcloud *) .vs__dropdown-toggle'

describe('look-board.css: share field focus edge', () => {
	it('leaves the input inside the toggle its own edge and focus rings', () => {
		expect(selectors()).not.toContain(`${TOGGLE} input`)
	})

	it('draws no ring around the toggle', () => {
		expect(selectors()).not.toContain(`${TOGGLE}:focus-within`)
	})

	it('a control: the suggestion list keeps its own 1px edge', () => {
		expect(selectors()).toContain('body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .vs__dropdown-menu:has(.cn-saved-view-share__option)')
	})
})
