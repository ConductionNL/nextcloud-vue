/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card table's head (CnTasksWidget, CnRecordListWidget) in the board look:
 * the sort control a bare square label with no margin, the funnel a 22px
 * button with a 4px radius (DqZaakTaken). jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function bodiesOf(selector) {
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

describe('look-board.css: card table head controls', () => {
	it.each([
		'.cn-look-board .cn-tasks-widget__head .cn-tasks-widget__head-sort:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-record-list__head .cn-record-list__sort:not(.cn-look-nextcloud *)',
	])('draws %s as a square label without margin', (selector) => {
		const body = bodiesOf(selector)
		expect(body).toContain('margin: 0;')
		expect(body).toContain('border-radius: 0;')
	})

	it.each([
		'.cn-look-board .cn-tasks-widget__head .cn-tasks-widget__head-filter .button-vue:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-record-list__head .cn-record-list__head-filter .button-vue:not(.cn-look-nextcloud *)',
	])('draws %s as a 22px funnel with a 4px radius', (selector) => {
		const body = bodiesOf(selector)
		expect(body).toContain('height: 22px;')
		expect(body).toContain('border-radius: 4px;')
	})
})
