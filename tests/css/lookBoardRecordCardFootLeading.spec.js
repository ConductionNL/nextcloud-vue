/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZakenSorteren: a record card's footer line ("—" and the deadline) is set
 * at normal leading, as the board draws it, so a card without a handler is
 * as tall as drawn.
 *
 * @spec openspec/changes/board-record-card-foot-leading/specs/board-record-card-foot-leading/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule whose selector list holds the given selector.
 *
 * @param {string} selector One selector of the list.
 * @return {string} The rule bodies joined, or ''.
 */
function rulesHolding(selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]', 'g')
	let out = ''
	let m
	while ((m = re.exec(css)) !== null) {
		const open = css.indexOf('{', m.index)
		out += css.slice(open, css.indexOf('}', open))
	}
	return out
}

describe('look-board-index.css: record card footer leading', () => {
	const foot = '.cn-look-board .cn-object-card--board .cn-object-card__record-foot'

	it('keeps the footer rule above its line (control)', () => {
		expect(rulesHolding(foot)).toMatch(/padding-top: 10px;/)
	})

	it('sets the footer line at normal leading', () => {
		expect(rulesHolding(foot)).toMatch(/line-height: normal;/)
	})
})
