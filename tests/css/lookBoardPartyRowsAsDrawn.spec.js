/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakBetrokkenen "Partijen" and "Rollen" rows at the board's spacing: a
 * role heading of one 18px line, 14px under the previous group and nothing
 * under the last; party rows at normal leading (60px, 75px with a two-line
 * meta), touching across role groups and 8px under the accepted kinds strip.
 * The widget's own scoped gap (12px) has the same specificity as a two-class
 * board rule, so the board rule names the root class twice.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-party-rows-as-drawn/specs/parties/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const TAB = '.cn-look-board .cn-contacts-tab'
const B = '.cn-look-board .cn-object-parties--board'

describe('look-board-detail.css: party rows as drawn', () => {
	it('heads a contacts role group with one 18px line and no margin of its own', () => {
		const body = rule(TAB + ' .cn-contacts-tab__group-title')
		expect(body).toContain('margin: 0;')
		expect(body).toContain('line-height: 1.2')
	})

	it('stands a contacts role group 14px under the previous one, the last one flush with the card', () => {
		expect(rule(TAB + ' .cn-contacts-tab__group')).toContain('margin-bottom: 14px')
		expect(rule(TAB + ' .cn-contacts-tab__group:last-child')).toContain('margin-bottom: 0')
	})

	it('sets the parties name and meta at normal leading', () => {
		expect(rule(B + ' .cn-object-parties__name,\n' + B + ' .cn-object-parties__meta')).toContain('line-height: normal')
	})

	it('keeps the board gap of 8px over the widget\'s scoped 12px', () => {
		expect(rule('.cn-look-board .cn-object-parties.cn-object-parties--board')).toContain('gap: 8px')
	})

	it('lets the rows of one role group follow the previous group without a gap', () => {
		expect(rule(B + ' .cn-object-parties__role + .cn-object-parties__role')).toContain('margin-top: -8px')
	})
})
