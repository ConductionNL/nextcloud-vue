/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaken: "Weergave opslaan" stays on row 1 beside the chips, and Filter with
 * the view switch starts row 2. jsdom draws no layout, so the rules are read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-toolbar-save-stays-on-row-one/specs/board-toolbar-save-stays-on-row-one/spec.md#requirement-save-view-stays-on-row-1-beside-the-chips
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const SCOPE = '.cn-look-board .cn-index-page:not(.cn-index-page--quick-filters-toolbar) .cn-actions-bar--board .cn-actions-bar__row--views'

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

describe('look-board-index.css: Save view stays on row 1', () => {
	it('leaves room on row 1 for Save view and lets the chips wrap inside', () => {
		const body = bodyOf(`${SCOPE} > .cn-quick-filter-bar--inline`)
		expect(body).toContain('flex: 0 1 auto;')
		expect(body).toContain('min-width: 0;')
		expect(body).toContain('max-width: calc(100% - var(--cn-board-save-view-room, 170px));')
	})

	it('keeps Save view at the top of row 1', () => {
		expect(bodyOf(`${SCOPE} > .cn-saved-views__save`)).toContain('align-self: flex-start;')
	})
})
