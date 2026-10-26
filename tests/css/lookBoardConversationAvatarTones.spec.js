/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A message's initials take their side's tone (DqZaakContact r31). Read from the stylesheet.
 *
 * @spec openspec/changes/board-conversation-avatar-tones/specs/board-conversation-avatar-tones/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('src/css/look-board-detail.css', () => {
	it('tones the resident and our initials', () => {
		expect(bodyOf('.cn-look-board .cn-conversation-thread .cn-conversation-thread__avatar:not(.cn-look-nextcloud *)')).toMatch(/color:\s*var\(--cn-board-text-soft\)/)
		expect(bodyOf('.cn-look-board .cn-conversation-thread .cn-conversation-thread__message--us .cn-conversation-thread__avatar:not(.cn-look-nextcloud *)')).toMatch(/background:\s*var\(--color-primary-element-light\)/)
	})
})
