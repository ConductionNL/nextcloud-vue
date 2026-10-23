/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The banner box (1px edge, own ground, radius 10, 12px 14px) leaves a detail
 * page's side notice alone, where the notice block is the box. Its higher
 * weight beat the flat-note rule and drew a bordered box in the notice
 * (DqZaak "Advies gevraagd"; COMPDIFF r25: border 1, width 268 vs 300).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-side-notice-flat-note/specs/board-side-notice-flat-note/spec.md#requirement-a-side-notices-banner-is-not-the-banner-box
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: the banner box and the side notice', () => {
	it('names no banner-widget notecard that a side notice could match', () => {
		const selectors = []
		const re = /([^{}]+)\{([^{}]*)\}/g
		let m
		while ((m = re.exec(css))) {
			if (/--cn-banner-ground|border: 1px solid var\(--cn-banner-edge\)/.test(m[2])) {
				selectors.push(...m[1].split(/,(?![^(]*\))/).map((s) => s.trim()))
			}
		}
		const banner = selectors.filter((s) => s.includes('.cn-banner-widget'))
		expect(banner.length).toBeGreaterThan(0)
		for (const s of banner) {
			expect(s).toContain('.cn-banner-widget:not(.cn-detail-page__side-item--notice *)')
		}
	})

	it('draws the note in the notice with no edge, padding or radius of its own', () => {
		const detail = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
		const at = detail.indexOf('.cn-look-board .cn-detail-page__side-item--notice .cn-banner-widget__card.notecard {')
		expect(at).toBeGreaterThan(-1)
		const body = detail.slice(at, detail.indexOf('}', at))
		for (const d of ['padding: 0;', 'border: 0;', 'border-radius: 0;', 'background-color: transparent !important;']) {
			expect(body).toContain(d)
		}
	})
})
