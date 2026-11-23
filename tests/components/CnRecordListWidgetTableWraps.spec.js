/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list drawn as a table wraps its words in a narrow side card
 * (DqTeamwachtrij "Werkvoorraad per zaaktype": "Melding openbare / ruimte"),
 * whatever white-space the host column hands down, so its last column stays
 * inside the card. The actions cell keeps its buttons on one line. jsdom draws
 * no layout, so the rules are read from the stylesheet text.
 */
import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const bodies = []
	let m
	while ((m = re.exec(style))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			bodies.push(m[2])
		}
	}
	return bodies.join('\n')
}

describe('CnRecordListWidget table: words wrap in a narrow card', () => {
	it('lets head and body cells wrap', () => {
		expect(rule('.cn-record-list__table th')).toContain('white-space: normal;')
		expect(rule('.cn-record-list__table td')).toContain('white-space: normal;')
	})

	it('keeps the actions cell on one line', () => {
		expect(rule('.cn-record-list__table .cn-record-list__cell--actions')).toContain('white-space: nowrap;')
	})
})
