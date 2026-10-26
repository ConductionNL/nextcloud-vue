/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The buildiq square is the brand orange #f36c21 in both looks: Ruben's
 * decision (22 Oct) has the boards follow the app.
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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('the board buildiq square', () => {
	// Superseded by Ruben's decision of 22 Oct (the boards follow the app): the
	// board look keeps the brand orange too.
	// @spec openspec/changes/board-buildiq-brand-orange/specs/board-buildiq-brand-orange/spec.md
	it('keeps the brand orange in the board look', () => {
		const rule = rulesFor(read('css/patches.css'), '.cn-look-board .cn-buildiq-edit .cn-buildiq-edit__actions .button-vue')
		expect(rule).not.toMatch(/--cn-buildiq-color:/)
	})

	it('keeps the brand orange outside the board look', () => {
		const rule = rulesFor(read('css/patches.css'), '.cn-buildiq-edit__actions .button-vue')
		expect(rule).toContain('var(--cn-buildiq-color, var(--c-orange-knvb, #f36c21))')
		const unscoped = rulesFor(read('css/patches.css'), '.cn-buildiq-edit__actions .button-vue')
		expect(unscoped).not.toMatch(/--cn-buildiq-color:/)
	})
})
