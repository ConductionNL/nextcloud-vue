/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailGrid in the board look draws its pairs as the boards do: plain
 * text, no grey card and no accent bar. The grid is a 13px muted label over a
 * 15px value at weight 500 with a hairline under each pair (DqZaak
 * "Zaakgegevens"); the horizontal layout is two columns of 14px text (the
 * side cards). jsdom draws no layout, so the values are read from the
 * stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const guard = ':not(.cn-look-nextcloud *)'

describe('look-board.css: CnDetailGrid', () => {
	it('draws an item as plain text: no padding, no ground, no accent bar', () => {
		const item = rulesFor(`.cn-look-board .cn-detail-grid .cn-detail-grid__item${guard}`)
		expect(item).toContain('padding: 0')
		expect(item).toContain('background: none')
		expect(item).toContain('border-inline-start: none')
	})

	it('spaces the grid 12px 24px at 15px and puts a hairline under each pair', () => {
		expect(rulesFor(`.cn-look-board .cn-detail-grid.cn-detail-grid--grid${guard}`)).toMatch(/gap: 12px 24px;[\s\S]*font-size: 15px/)
		expect(rulesFor(`.cn-look-board .cn-detail-grid.cn-detail-grid--grid .cn-detail-grid__item${guard}`)).toMatch(/padding-bottom: 10px;[\s\S]*border-bottom: 1px solid var\(--cn-board-hairline\)/)
	})

	it('draws the label 13px, regular and muted, and hands that ink to a forcing theme', () => {
		const label = rulesFor(`.cn-look-board .cn-detail-grid .cn-detail-grid__label${guard}`)
		expect(label).toContain('--nldesign-color-on-surface: var(--color-text-maxcontrast)')
		expect(label).toContain('font-size: 13px')
		expect(label).toContain('font-weight: 400')
	})

	it('draws the value at weight 500 without the default margin', () => {
		const value = rulesFor(`.cn-look-board .cn-detail-grid .cn-detail-grid__value${guard}`)
		expect(value).toContain('margin: 0')
		expect(value).toContain('font-weight: 500')
	})

	it('sets label and value at the board line height, 1.2', () => {
		expect(rulesFor(`.cn-look-board .cn-detail-grid .cn-detail-grid__label${guard}`)).toContain('line-height: 1.2')
		expect(rulesFor(`.cn-look-board .cn-detail-grid .cn-detail-grid__value${guard}`)).toContain('line-height: 1.2')
	})

	it('lays the horizontal layout out as two columns, the labels as wide as the longest', () => {
		expect(rulesFor(`.cn-look-board .cn-detail-grid.cn-detail-grid--horizontal${guard}`)).toMatch(/grid-template-columns: max-content 1fr;[\s\S]*gap: 8px 16px;[\s\S]*font-size: 14px/)
		expect(rulesFor(`.cn-look-board .cn-detail-grid.cn-detail-grid--horizontal .cn-detail-grid__item${guard}`)).toContain('display: contents')
	})
})
