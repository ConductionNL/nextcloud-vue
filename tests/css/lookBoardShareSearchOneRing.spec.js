/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The share field (DqFilterDelen) draws one focus ring: the input inside the
 * toggle has no border or outline of its own, and the toggle draws the 2px
 * main-text ring while focus is inside it. jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-share-search-one-ring/specs/board-share-search-one-ring/spec.md#requirement-the-share-field-draws-one-focus-ring
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

const TOGGLE = '.cn-look-board .cn-saved-view-share__search:not(.cn-look-nextcloud *) .vs__dropdown-toggle'

describe('look-board.css: share field focus ring', () => {
	it('draws no border or outline on the input inside the toggle', () => {
		const rule = ruleFor(`${TOGGLE} input`)
		expect(rule).toContain('border: 0 !important;')
		expect(rule).toContain('outline: none !important;')
		expect(rule).toContain('box-shadow: none !important;')
	})

	it('rings the toggle in the main text while focus is inside it', () => {
		expect(ruleFor(`${TOGGLE}:focus-within`)).toContain('outline: 2px solid var(--color-main-text);')
	})

	it('a control: the suggestion list keeps its own 1px edge', () => {
		expect(ruleFor('body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .vs__dropdown-menu:has(.cn-saved-view-share__option)')).toContain('border-width: 0 1px 1px !important;')
	})
})
