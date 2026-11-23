/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board detail page's header is padded 4px 0 8px, as every detail board
 * draws its header section; the dashboard header keeps its own spacing.
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

describe('look-board.css: detail header bottom', () => {
	it('pads the detail header 8px under its rows', () => {
		expect(bodiesOf('.cn-look-board .cn-detail-page:not(.cn-look-nextcloud *) .cn-detail-page__header')).toContain('padding-bottom: 8px;')
	})

	it('leaves the dashboard header without it', () => {
		expect(bodiesOf('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__header')).not.toContain('padding-bottom: 8px;')
	})
})
