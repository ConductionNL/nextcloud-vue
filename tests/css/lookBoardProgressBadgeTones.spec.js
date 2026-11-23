/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table cell's progress badge ("Verouderd 12 dagen" beside the win chance,
 * PqLeads) takes the board tag tones under the board look, as a status badge
 * does: the theme's status badge ground and ink, not a translucent mix of the
 * Nextcloud error colour. jsdom draws no layout, so the rules are read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-tag-tones/specs/board-tag-tones/spec.md#requirement-a-toned-board-tag-takes-the-themes-status-badge-tokens
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector A selector in a rule's list.
 * @return {string|null} The body of the first rule that lists it.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board.css: progress badge tones', () => {
	for (const tone of ['success', 'warning', 'error']) {
		it(`a ${tone} progress badge reads the board ${tone} tag ground and ink`, () => {
			const body = ruleFor(`.cn-look-board .cn-cell-renderer__progress-badge--${tone}:not(.cn-look-nextcloud *)`)
			expect(body).not.toBeNull()
			expect(body).toContain(`var(--nldesign-component-status-badge-${tone}-color`)
			expect(body).toContain(`var(--nldesign-component-status-badge-${tone}-background-color`)
		})
	}
})
