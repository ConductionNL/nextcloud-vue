/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw an inactive segmented option and a count pill in the grey
 * text (#3D4047 under Zuiddrecht), which a theme names
 * `--nl-color-grey-text`. The board look reads it, falling back to its mix of
 * the main and muted text without one. jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('the board look reads the theme\'s grey text', () => {
	it('takes --nl-color-grey-text for the soft text, with the mix as fallback', () => {
		expect(read('look-board.css')).toMatch(/--cn-board-text-soft: var\(--nl-color-grey-text, color-mix\(in srgb, var\(--color-main-text\) 45%, var\(--color-text-maxcontrast\)\)\);/)
	})

	it('draws an inactive segmented option in it, the checked one in the main text', () => {
		const css = read('look-board.css')
		expect(bodyOf(css, '.cn-look-board .cn-segmented-control .cn-segmented-control__option:not(.cn-segmented-control__option--checked):not(.cn-look-nextcloud *)')).toContain('color: var(--cn-board-text-soft);')
	})

	it('draws a folder count in it', () => {
		expect(bodyOf(read('look-board-index.css'), '.cn-look-board .cn-index-page__folder-pane .cn-folder-tree__count')).toContain('color: var(--cn-board-text-soft);')
	})
})
