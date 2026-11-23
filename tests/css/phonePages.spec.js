/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * phone-pages (board PqMobiel): at phone width the board dialog is a bottom
 * sheet, the detail header's title row is as tall as its content, and a
 * dashboard widget's Actions menu shows its icon only. jsdom lays nothing out,
 * so the rules are asserted on the stylesheets; the layout itself was measured
 * at 390px in a browser (see the PR).
 *
 * @spec openspec/changes/phone-pages/specs/phone-pages/spec.md#requirement-the-library-pages-hold-at-phone-width
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8')
function block(css, query) {
	const start = css.indexOf(query)
	return start < 0 ? '' : css.slice(start)
}

describe('phone pages', () => {
	it('draws the board dialog as a bottom sheet below 600px', () => {
		const phone = block(read('css/dialog.css'), '@media (max-width: 600px)')
		expect(phone).toMatch(/\.modal-mask\.cn-dialog-board \.modal-wrapper \.modal-container[^{]*\{[^}]*inset:\s*auto 0 0;[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*height:\s*auto;[^}]*border-radius:\s*16px 16px 0 0;/)
		expect(phone).toMatch(/\.cn-dialog-board \.dialog__actions > \*\s*\{[^}]*flex:\s*1 1 0;[^}]*min-height:\s*44px;/)
	})

	it('lets the board detail header\'s title row take its own height in the phone column', () => {
		const phone = block(read('css/look-board-detail.css'), '@media (max-width: 768px)')
		expect(phone).toMatch(/\.cn-look-board \.cn-detail-page__header--board > :first-child\s*\{\s*flex:\s*none;/)
	})

	it('shows the widget Actions menu as an icon on a phone, keeping its name for assistive tech', () => {
		const phone = block(read('components/CnDashboardPage/CnDashboardPage.vue'), '@media (max-width: 640px)')
		expect(phone).toMatch(/\.action-item__menutoggle \.button-vue__text\)\s*\{[^}]*position:\s*absolute;[^}]*clip-path:\s*inset\(50%\);/)
		expect(phone).not.toMatch(/\.button-vue__text\)\s*\{[^}]*display:\s*none/)
	})
})
