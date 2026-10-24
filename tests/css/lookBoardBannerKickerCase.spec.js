/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard banner's kicker is set in sentence case at 13px bold with
 * no tracking (DqMijnWerk "Vandaag eerst"). jsdom draws no layout, so the
 * rule is read from the stylesheet.
 *
 * @spec openspec/changes/board-banner-kicker-case/specs/board-banner-kicker-case/spec.md#requirement-a-board-dashboard-banners-kicker-is-in-sentence-case
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const SELECTOR = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-banner-widget__kicker'

describe('look-board: a dashboard banner kicker in sentence case', () => {
	it('sets the kicker 13px bold, untracked, not in capitals', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		let body = ''
		let m
		while ((m = re.exec(css))) {
			if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(SELECTOR)) {
				body = m[2]
			}
		}
		expect(body).toMatch(/text-transform:\s*none/)
		expect(body).toMatch(/letter-spacing:\s*0/)
		expect(body).toMatch(/font-size:\s*13px/)
		expect(body).toMatch(/font-weight:\s*700/)
	})
})
