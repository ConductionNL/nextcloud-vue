/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a tree menu draws the board's folder rows (DqCatalogus).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-menu-tree-rows/specs/board-menu-tree-rows/spec.md#requirement-a-board-tree-menu-draws-the-boards-folder-rows
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
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const TREE = '.cn-look-board .cn-menu-widget--style-tree:not(.cn-look-nextcloud *)'

describe('look-board.css: a board tree menu draws folder rows', () => {
	it('pads, rounds and sizes a row as the board does', () => {
		const body = bodyOf(`${TREE} .cn-menu-tree-node__row`)
		expect(body).toContain('padding-block: 8px;')
		expect(body).toContain('padding-inline-end: 10px;')
		expect(body).toContain('border-radius: 8px;')
		expect(body).toContain('font-size: 15px;')
		expect(bodyOf(`${TREE} .cn-menu-tree-node--depth-1 > .cn-menu-tree-node__row`)).toContain('padding-inline-start: 10px !important;')
	})

	it('keeps the row ink on the label link, without an underline under a theme', () => {
		expect(bodyOf(`${TREE} .cn-menu-tree-node__row`)).toContain('--nldesign-component-link-text-decoration: none;')
		expect(bodyOf(`${TREE} .cn-menu-tree-node__label-button`)).toContain('text-decoration: none;')
	})

	it('sets rows 2px apart in a card padded 14px', () => {
		expect(bodyOf(`${TREE} .cn-menu-widget__tree`)).toContain('gap: 2px;')
		expect(bodyOf('.cn-look-board .cn-widget-wrapper:not(.cn-look-nextcloud *):has(.cn-menu-widget--style-tree) .cn-widget-wrapper__content')).toContain('padding: 14px;')
	})

	it('drops the caret column when no row has children', () => {
		expect(bodyOf(`${TREE} .cn-menu-widget__tree:not(:has(.cn-menu-tree-node__caret)) .cn-menu-tree-node__caret-spacer`)).toContain('display: none;')
	})

	it('draws the open row on the primary tint at 700', () => {
		const body = bodyOf('.cn-look-board .cn-menu-widget--style-tree.cn-menu-widget--highlight-background:not(.cn-look-nextcloud *) .cn-menu-tree-node__row.cn-menu-widget__item--active')
		expect(body).toContain('background: var(--color-primary-element-light);')
		expect(body).toContain('color: var(--color-primary-element-light-text);')
		expect(body).toContain('font-weight: 700;')
	})
})
