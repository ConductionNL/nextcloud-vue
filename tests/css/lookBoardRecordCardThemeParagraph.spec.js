/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The theme sets every paragraph through its tokens with `!important` (15px in
 * the main ink), which drew the record card's meta line and note at 15px dark
 * on :8080 (DqAanMijToegewezen, DqZakenSorteren). Each hands the theme its
 * own size and ink through those tokens. jsdom draws no cascade, so the rules
 * are read as text.
 *
 * @spec openspec/changes/board-record-card-text-past-theme-paragraph/specs/board-record-card-text-past-theme-paragraph/spec.md#requirement-the-record-cards-paragraphs-keep-their-size-and-ink-under-the-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} cls The class after `.cn-object-card--board`.
 * @return {string} The rule's body.
 */
function body(cls) {
	const match = css.match(new RegExp(`\\.cn-look-board \\.cn-object-card--board \\.${cls} \\{([^}]*)\\}`))
	return match ? match[1] : ''
}

describe('record card paragraphs under the theme', () => {
	it('the meta line hands the theme 14px in the muted ink', () => {
		expect(body('cn-object-card__record-meta')).toContain('--nldesign-component-paragraph-font-size: 14px;')
		expect(body('cn-object-card__record-meta')).toContain('--nldesign-component-paragraph-color: var(--color-text-maxcontrast);')
	})

	it('the note hands the theme 13px semibold in its tone', () => {
		const note = body('cn-object-card__record-note')
		expect(note).toContain('--nldesign-component-paragraph-font-size: 13px;')
		expect(note).toContain('--nldesign-component-paragraph-font-weight: 600;')
		expect(note).toContain('--nldesign-component-paragraph-color: var(--cn-board-text-soft);')
		expect(body('cn-object-card__record-note--purple')).toContain('--nldesign-component-paragraph-color: var(--cn-status-purple-text);')
		expect(body('cn-object-card__record-note--teal')).toContain('--nldesign-component-paragraph-color: var(--cn-status-teal-text);')
	})
})
