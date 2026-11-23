/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look every status tag is the boards' one tag: 13px at 600 on
 * a 3px 10px pad with a 12px corner and a normal line, 21px tall, a small
 * badge and a table cell's tag included. jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 *
 * @spec openspec/changes/board-tags-shape/specs/board-tags-shape/spec.md#requirement-a-board-tag-is-a-21px-rounded-rectangle
 */
const fs = require('fs')
const path = require('path')

/**
 * A stylesheet's text without its comments.
 *
 * @param {string} name The file under src/css.
 * @return {string} The text.
 */
function sheet(name) {
	return fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('board tags', () => {
	it('gives every badge, small ones too, the board tag', () => {
		const body = bodiesOf(sheet('look-board.css'), '.cn-look-board .cn-status-badge:not(.cn-look-nextcloud *)')
		for (const decl of ['padding: 3px 10px;', 'border-radius: 12px;', 'font-size: 13px;', 'font-weight: 600;', 'line-height: normal;']) {
			expect(body).toContain(decl)
		}
		expect(sheet('look-board.css')).not.toContain('.cn-look-board .cn-status-badge:not(.cn-status-badge--small)')
	})

	it('sets a table cell tag on a normal line', () => {
		const body = bodiesOf(sheet('look-board-index.css'), '.cn-look-board .cn-table-container--board .cn-data-table .cn-status-badge')
		expect(body).toContain('line-height: normal;')
		expect(body).not.toContain('line-height: 1.4;')
	})
})
