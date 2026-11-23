/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a banner's actions as the board's buttons: 40px tall, 14px
 * text, a primary with no edge (PtDashboard "Verzoek beoordelen"). The banner
 * read Nextcloud's 34px clickable area and the 15px body text, and edged its
 * primary in the primary colour. jsdom draws no layout, so the rules are read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-banner-action-buttons/specs/board-banner-action-buttons/spec.md#requirement-a-board-banners-actions-are-the-boards-buttons
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
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

describe('look-board.css: banner actions', () => {
	it('draws them 40px tall at 14px', () => {
		const body = ruleFor('.cn-look-board .cn-banner-widget__action:not(.cn-look-nextcloud *)')
		expect(body).toContain('min-height: var(--cn-board-control-height);')
		expect(body).toContain('font-size: 14px;')
	})

	it('draws the primary with no edge', () => {
		expect(ruleFor('.cn-look-board .cn-banner-widget__action--primary:not(.cn-look-nextcloud *)')).toContain('border: 0;')
	})
})
