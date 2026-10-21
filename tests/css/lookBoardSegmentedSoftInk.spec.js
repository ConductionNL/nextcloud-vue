/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look every segmented control draws the options not chosen in
 * the soft ink; the chosen one keeps the main text. Read from the stylesheet
 * text.
 *
 * @spec openspec/changes/board-segmented-soft-ink/specs/board-segmented-soft-ink/spec.md#requirement-a-board-segmented-control-draws-the-options-not-chosen-in-the-soft-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: segmented control ink', () => {
	const selector = '.cn-look-board .cn-segmented-control .cn-segmented-control__option:not(.cn-segmented-control__option--checked):not(.cn-look-nextcloud *)'

	it('draws an option not chosen in the soft ink, on any page', () => {
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('color: var(--cn-board-text-soft);')
		expect(body).toContain('--nldesign-color-on-surface: var(--cn-board-text-soft);')
	})
})
