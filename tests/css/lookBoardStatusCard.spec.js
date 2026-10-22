/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the Status card of a detail page draws the status lines
 * on the card itself, with no grey box, and a hairline above the attention
 * flag. jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-status-card-flat/specs/board-status-card-flat/spec.md#requirement-the-status-explainer-is-flat-in-the-board-look
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board-detail.css: the Status card', () => {
	it.each([
		'background: transparent;',
		'border-radius: 0;',
		'gap: 2px;',
		'padding: 0;',
	])('the explainer is flat: %s', (decl) => {
		expect(bodyOf('.cn-look-board .cn-status-explainer.cn-status-explainer:not(.cn-look-nextcloud *)')).toContain(decl)
	})

	it.each([
		'color: var(--color-main-text);',
		'font-size: 15px;',
		'font-weight: 700;',
	])('the explanation is the status line: %s', (decl) => {
		expect(bodyOf('.cn-look-board .cn-status-explainer .cn-status-explainer__muted:not(.cn-look-nextcloud *)')).toContain(decl)
	})

	it.each([
		'color: var(--color-text-maxcontrast);',
		'font-size: 13px;',
	])('the dwell line is small and muted: %s', (decl) => {
		expect(bodyOf('.cn-look-board .cn-status-explainer .cn-status-explainer__dwell:not(.cn-status-explainer__dwell--breached):not(.cn-look-nextcloud *)')).toContain(decl)
	})

	it.each([
		'border-top: 1px solid var(--cn-board-hairline);',
		'gap: 6px;',
		'padding: 10px 0 0;',
	])('the attention flag sits under a hairline: %s', (decl) => {
		expect(bodyOf('.cn-look-board .cn-detail-page__sections-card .cn-attention-flag.cn-attention-flag:not(.cn-look-nextcloud *)')).toContain(decl)
	})
})
