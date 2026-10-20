/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look an index page's folder pane draws the board's folder rows
 * (DqAfdelingen). jsdom draws no layout, so the rules are read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-folder-pane-rows/specs/board-folder-pane-rows/spec.md#requirement-a-board-folder-pane-draws-the-boards-folder-rows
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
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const PANE = '.cn-look-board .cn-index-page__folder-pane'
const CHILD = '.cn-folder-tree__children'

describe('look-board-index.css: the folder pane draws folder rows', () => {
	it('pads, rounds and sizes a row at 400 under a theme', () => {
		const body = bodyOf(`${PANE} .cn-folder-tree__item`)
		expect(body).toContain('padding: 8px 10px;')
		expect(body).toContain('border-radius: 8px;')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 400;')
		expect(body).toContain('--nldesign-component-button-font-weight: 400;')
	})

	it('indents each level inside the row', () => {
		expect(bodyOf(`${PANE} ${CHILD}`)).toContain('padding-inline-start: 0;')
		expect(bodyOf(`${PANE} ${CHILD} .cn-folder-tree__item`)).toContain('padding-inline-start: 28px;')
		expect(bodyOf(`${PANE} ${CHILD} ${CHILD} .cn-folder-tree__item`)).toContain('padding-inline-start: 46px;')
	})

	it('draws no folder icon', () => {
		expect(bodyOf(`${PANE} .cn-folder-tree__item > :not(.cn-folder-tree__name):not(.cn-folder-tree__count)`)).toContain('display: none;')
	})

	it('draws the open folder on the primary tint at 700', () => {
		const body = bodyOf(`${PANE} .cn-folder-tree__item--active`)
		expect(body).toContain('background-color: var(--color-primary-element-light);')
		expect(body).toContain('color: var(--color-primary-element-light-text);')
		expect(body).toContain('font-weight: 700;')
	})
})
