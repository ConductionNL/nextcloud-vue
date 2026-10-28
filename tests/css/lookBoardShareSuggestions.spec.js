/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The share field's suggestions (DqFilterDelen, "han") are the board's list:
 * a 1px edge in the field's ink, rows 14px in, and a kind pill ("Persoon",
 * "Groep") 18px high in the soft ink. The list floats on the body, outside
 * the board look's root, so its rules key on the page holding the look and
 * on the list holding a share option. jsdom draws no layout, so the rules are
 * read from the stylesheet text.
 *
 * @spec openspec/changes/board-share-suggestions/specs/board-share-suggestions/spec.md#requirement-the-share-fields-suggestions-are-the-boards-list
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

const LIST = 'body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .vs__dropdown-menu:has(.cn-saved-view-share__option)'

describe('look-board.css: share suggestions', () => {
	it('edges the list with 1px and sets it 6px in, over NcSelect\'s own !important edge', () => {
		expect(ruleFor(LIST)).toContain('border-width: 0 1px 1px !important;')
		expect(ruleFor(LIST)).toContain('padding: 4px 6px !important;')
	})

	it('sets the rows 14px in', () => {
		expect(ruleFor(`${LIST} .vs__dropdown-option`)).toContain('padding-inline: 14px;')
	})

	it('draws the kind pill on the normal line in the soft ink', () => {
		const rule = ruleFor(`${LIST} .cn-saved-view-share__pill`)
		expect(rule).toContain('line-height: normal;')
		expect(rule).toContain('color: color-mix(in srgb, var(--color-main-text) 45%, var(--color-text-maxcontrast));')
	})
})
