/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board facts and their lines on the font's own leading (DqHandhaving side
 * cards). jsdom draws no layout, so the rule is read from the stylesheet.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: facts leading', () => {
	it.each([
		'.cn-look-board .cn-facts-widget__rows:not(.cn-look-nextcloud *)',
		'.cn-look-board .cn-facts-widget__line:not(.cn-look-nextcloud *)',
	])('sets %s on the normal leading', (selector) => {
		expect(bodiesOf(selector)).toContain('line-height: normal;')
	})
})
