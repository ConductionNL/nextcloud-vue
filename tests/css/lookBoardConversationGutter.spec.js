/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a conversation message keeps 64px free away from its
 * avatar and its meta line takes the soft ink (DqZaakContact; COMPDIFF r25:
 * bubble 707.7 vs 643.7 wide, meta ink 27,28,29 / 35,74,120 vs 61,64,71).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-conversation-gutter-and-meta-ink/specs/board-conversation/spec.md#requirement-a-board-message-keeps-a-gutter-opposite-its-avatar
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

const T = '.cn-look-board .cn-conversation-thread'
const NOT_NC = ':not(.cn-look-nextcloud *)'

describe('look-board-detail.css: conversation gutter and meta ink', () => {
	it('keeps 64px free at the end of the other side\'s message', () => {
		expect(bodyOf(`${T} .cn-conversation-thread__message${NOT_NC}`)).toContain('padding-inline-end: 64px;')
	})

	it('keeps 64px free at the start of our message', () => {
		const us = bodyOf(`${T} .cn-conversation-thread__message--us${NOT_NC}`)
		expect(us).toContain('padding-inline-start: 64px;')
		expect(us).toContain('padding-inline-end: 0;')
	})

	it('sets the meta line and its time in the soft ink at line height normal', () => {
		const meta = bodyOf(`${T} .cn-conversation-thread__meta${NOT_NC}`)
		expect(bodyOf(`${T} .cn-conversation-thread__meta time${NOT_NC}`)).toContain('color: var(--cn-board-text-soft);')
		expect(meta).toContain('color: var(--cn-board-text-soft);')
		expect(meta).toContain('line-height: normal;')
	})

	it('sets our bubble\'s text in the main ink, named through the thread', () => {
		expect(bodyOf(`${T} .cn-conversation-thread__message--us .cn-conversation-thread__bubble${NOT_NC}`)).toContain('color: var(--color-main-text);')
	})
})
