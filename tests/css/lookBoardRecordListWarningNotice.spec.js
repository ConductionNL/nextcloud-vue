/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list's warning notice (DqZaaktypeOverzicht "Controle") sits on the
 * theme's warning tint in the board look, as the board notice does: the
 * component's own ground reads `--color-warning-light`, which Nextcloud 34
 * does not have, so it fell to rgba(255, 196, 0, 0.12). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-notice-warning-tint/specs/board-notice-warning-tint/spec.md
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

describe('look-board.css: a record list warning notice', () => {
	it('sits on the warning tint', () => {
		expect(rulesFor('.cn-look-board .cn-record-list__notice--warning:not(.cn-look-nextcloud *)'))
			.toMatch(/background:\s*var\(--cn-board-notice-bg\)/)
	})
})
