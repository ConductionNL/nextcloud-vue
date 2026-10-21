/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-dialog-top: above a phone a board dialog sits near the top of the
 * screen (the boards put its top edge about 90px down) instead of centred; on
 * a phone it stays the bottom sheet. Measured in a browser at 1440x900: the
 * container's top moved from 328 to 88. jsdom lays nothing out, so the rule is
 * asserted on the stylesheet.
 *
 * @spec openspec/changes/board-dialog-top/specs/dialog-system/spec.md#requirement-a-board-dialog-is-top-aligned-above-a-phone
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8')

describe('dialog.css: top-aligned above a phone', () => {
	it('top-aligns the board dialog above 600px with a themeable offset', () => {
		const wide = css.slice(css.indexOf('@media (min-width: 601px)'))
		expect(wide).toMatch(/\.modal-mask\.cn-dialog-board \.modal-wrapper\s*\{\s*align-items:\s*flex-start;/)
		expect(wide).toMatch(/\.modal-container\s*\{\s*margin-top:\s*var\(--cn-dialog-top, 88px\);/)
	})

	it('keeps the phone bottom sheet', () => {
		expect(css).toContain('@media (max-width: 600px)')
		expect(css).toMatch(/inset:\s*auto 0 0;/)
	})
})
