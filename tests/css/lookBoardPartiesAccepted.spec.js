/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The parties widget's "Dit zaaktype accepteert" strip in the board look, as
 * DqZaakBetrokkenen draws it (design-system #426; r26c: radius 12 vs 8,
 * ground 240 vs 245, label 15/600 vs 14/700): a sunken strip rounded at
 * 8px, the label 14px bold, the kinds as outlined 13px chips.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-parties-accepted-strip/specs/parties/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const P = '.cn-look-board .cn-object-parties'

describe('look-board-detail.css: the accepted kinds strip', () => {
	it('is a sunken strip rounded at 8px, 8px 12px in', () => {
		const body = rule(P + ' .cn-object-parties__accepted')
		expect(body).toContain('border-radius: 8px')
		expect(body).toContain('background-color: var(--cn-board-sunken-ground)')
		expect(body).toContain('padding: 8px 12px')
		expect(body).toContain('gap: 6px 8px')
	})

	it('labels it 14px bold', () => {
		const body = rule(P + ' .cn-object-parties__accepted-label')
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('font-weight: 700')
		expect(body).toContain('line-height: 1.2')
	})

	it('draws the kinds as outlined 13px chips on the strip\'s own ground (r31: the badge\'s #f0f1f3 on the #f5f6f8 strip)', () => {
		const body = rule(P + ' .cn-object-parties__accepted-kind.cn-status-badge:not(.cn-look-nextcloud *)')
		expect(body).toContain('border: 1px solid var(--color-border-maxcontrast)')
		expect(body).toContain('font-size: 13px')
		expect(body).toContain('background-color: transparent')
	})

	it('sets the source line 13px at line height 1.2 (r30: 15px at 22.5, the strip 66 vs 58)', () => {
		const body = rule(P + ' .cn-object-parties__accepted .cn-object-parties__muted')
		expect(body).toContain('font-size: 13px')
		expect(body).toContain('line-height: 1.2')
	})
})
