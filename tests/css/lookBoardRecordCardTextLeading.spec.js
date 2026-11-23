/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * r31 (#543): the record card's meta line stood 13px under the title's text
 * where the boards draw 10 (DqAanMijToegewezen, six cards): the title ran at
 * 1.3 and the meta line took the theme's paragraph leading (21px for 14px).
 * Both read at their normal leading. jsdom draws no layout, so the rules are
 * read as text.
 *
 * @spec openspec/changes/board-record-card-text-leading/specs/board-record-card-text-leading/spec.md#requirement-a-record-cards-title-and-meta-line-sit-10px-apart
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The selector, as written.
 * @return {string} The rule's body, or ''.
 */
function body(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = css.match(new RegExp(`${escaped} \\{([^}]*)\\}`))
	return match ? match[1] : ''
}

describe('the record card text leading', () => {
	it('sets the title at its normal leading', () => {
		expect(body('.cn-look-board .cn-object-card--board .cn-object-card__record .cn-object-card__title')).toContain('line-height: normal;')
	})

	it('hands the theme a normal leading for the meta line and the note', () => {
		for (const sel of ['.cn-look-board .cn-object-card--board .cn-object-card__record-meta', '.cn-look-board .cn-object-card--board .cn-object-card__record-note']) {
			const rule = body(sel)
			expect(rule).toContain('--nldesign-component-paragraph-line-height: normal;')
			expect(rule).toContain('line-height: normal;')
		}
	})
})
