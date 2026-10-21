/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the buildiq square is the boards' orange (#e2611a, the
 * white icon on it 3.52:1); the Nextcloud look keeps the brand orange.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-buildiq-orange/specs/board-buildiq-orange/spec.md#requirement-the-board-buildiq-square-is-the-boards-orange
 */
const fs = require('fs')
const path = require('path')

const read = (rel) => fs.readFileSync(path.join(__dirname, '../../src', rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} css The stylesheet.
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(css, selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: the buildiq square', () => {
	it('fills the board square with the boards\' orange', () => {
		const rule = rulesFor(read('css/look-board.css'), '.cn-look-board .cn-buildiq-edit .cn-buildiq-edit__actions .button-vue')
		expect(rule).toMatch(/--cn-buildiq-color:\s*#e2611a;/)
	})

	it('keeps the brand orange outside the board look', () => {
		const rule = rulesFor(read('css/patches.css'), '.cn-buildiq-edit__actions .button-vue')
		expect(rule).toContain('var(--cn-buildiq-color, var(--c-orange-knvb, #f36c21))')
		expect(read('css/patches.css')).not.toMatch(/--cn-buildiq-color:/)
	})
})
