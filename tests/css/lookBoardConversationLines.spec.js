/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a message's subject and note sit at the normal line
 * height, as DqZaakContact draws them (COMPDIFF r35: subject line 22.5 vs 18,
 * note 19.5 vs 15.6, so the bubbles stood 4.5 to 9px tall).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-conversation-lines-as-drawn/specs/board-conversation-lines-as-drawn/spec.md#requirement-a-board-messages-subject-and-note-sit-at-the-normal-line-height
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

describe('look-board-detail.css: a message subject and note', () => {
	it.each(['subject', 'note'])('sets the %s at the normal line height', (part) => {
		expect(bodyOf(`.cn-look-board .cn-conversation-thread .cn-conversation-thread__${part}${NOT_NC}`)).toContain('line-height: normal;')
	})

	it('leaves the message text at 1.5', () => {
		expect(bodyOf(`.cn-look-board .cn-conversation-thread .cn-conversation-thread__text${NOT_NC}`)).toBe('')
	})
})
