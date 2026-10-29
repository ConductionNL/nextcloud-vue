/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a conversation's reply box opens with a hairline and its
 * field is the two-line 67px field (DqZaakContact; COMPDIFF r24 h 67 vs 48).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-conversation-reply-box/specs/board-conversation-reply-box/spec.md#requirement-the-board-reply-box
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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const NOT_NC = ':not(.cn-look-nextcloud *)'

describe('look-board-detail.css: the conversation reply box', () => {
	it.each([
		'gap: 10px;',
		'padding-top: 16px;',
		'border-top: 1px solid var(--cn-board-hairline);',
	])('opens the box with %s', (declaration) => {
		expect(bodyOf(`.cn-look-board .cn-conversation-thread__reply${NOT_NC}`)).toContain(declaration)
	})

	it.each([
		'padding: 10px 12px;',
		'font-size: 15px;',
		'line-height: 1.5;',
		'min-height: calc(3em + 22px);',
	])('draws the field with %s', (declaration) => {
		expect(bodyOf(`.cn-look-board .cn-conversation-thread__input${NOT_NC}`)).toContain(declaration)
	})

	it('sets the option at 14px', () => {
		expect(bodyOf(`.cn-look-board .cn-conversation-thread__reply-option${NOT_NC}`)).toContain('font-size: 14px;')
	})
})
