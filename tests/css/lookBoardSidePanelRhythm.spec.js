/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The index side panel in the board look as DqFilterBeheren / DqFilterInMenu
 * draw it (r31 on :8080): its content 20px in from the panel edge (live 26:
 * the tab's 10px and the section's 16px), the subtitle 2px under the title at
 * a normal line height (live 5px at 1.6, pushing the tabs 13px down), the
 * saved-view rows' text at a normal line height (row text 3px lower), the
 * manage menu 278px outside (264 of content, 6px in, a 1px line), and the
 * share dialog's audience names at a normal line height (DqFilterDelen 21 vs
 * 16.8). A saved view's name drops the core button's 3px margin (row 56
 * vs 50).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-side-panel-rhythm/specs/board-side-panel-rhythm/spec.md
 */
const fs = require('fs')
const path = require('path')

const strip = (f) => fs.readFileSync(path.join(__dirname, '../../src/css', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const index = strip('look-board-index.css')
const board = strip('look-board.css')

/** The body of the rule whose selector starts at `selector`. */
function body(css, selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board side panel rhythm', () => {
	it('puts the panel content 20px in: 10px of section padding on the tab\'s 10px', () => {
		expect(body(index, '.cn-look-board:has(.cn-index-page) > .app-sidebar .cn-index-sidebar__section')).toMatch(/padding: 10px;/)
	})

	it('sets the subtitle 2px under the title at a normal line height', () => {
		const b = body(index, '.cn-look-board:has(.cn-index-page) > .app-sidebar .app-sidebar-header__subname')
		expect(b).toMatch(/margin-top: 2px;/)
		expect(b).toMatch(/line-height: normal;/)
	})

	it('drops the core button margin on a saved view row\'s name, so its text sits 8px from the row top', () => {
		expect(body(index, '.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *) .cn-saved-views-panel__name')).toMatch(/margin: 0;/)
	})

	it('runs a saved view row\'s name and description at a normal line height', () => {
		expect(body(index, '.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *) .cn-saved-views-panel__name-text')).toMatch(/line-height: normal;/)
	})

	it('draws the manage menu 278px outside', () => {
		expect(body(board, 'body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .v-popper__popper.action-item__popper:has(li[data-testid^="cn-saved-views-"]) .v-popper__wrapper .v-popper__inner')).toMatch(/width: 278px;/)
	})

	it('draws a share row 56px tall, its rights select 36px, and the hint and caption at a normal line height', () => {
		expect(body(board, '.cn-look-board .cn-saved-view-share__mode:not(.cn-look-nextcloud *)')).toMatch(/min-height: 56px;/)
		expect(body(board, '.cn-look-board .cn-saved-view-share__rights:not(.cn-look-nextcloud *)')).toMatch(/--default-clickable-area: 36px;/)
		expect(body(board, '.cn-look-board .cn-saved-view-share__caption:not(.cn-look-nextcloud *)')).toMatch(/line-height: normal;/)
		expect(body(board, '.cn-look-board .cn-saved-view-share > .v-select:not(.cn-look-nextcloud *)')).toMatch(/margin-bottom: 0;/)
	})

	it('runs the manage menu labels at a normal line height, so an item is 44px', () => {
		const sel = 'body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .v-popper__popper.action-item__popper li.action[data-testid^="cn-saved-views-"] '
		expect(body(board, sel + '.action-button__text')).toMatch(/line-height: normal;/)
		expect(body(board, sel + '.action-button__description')).toMatch(/line-height: normal;/)
	})

	it('draws the count pill at a normal line height and the read-only label in the soft ink', () => {
		expect(body(index, '.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *) .cn-saved-views-panel__count')).toMatch(/line-height: normal;/)
		expect(body(index, '.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *) .cn-saved-views-panel__read-only')).toMatch(/color: var\(--cn-board-text-soft\);/)
	})

	it('lets a view\'s description wrap under its name', () => {
		const panel = '.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *) '
		expect(body(index, panel + '.cn-saved-views-panel__subline')).toMatch(/white-space: normal;/)
		expect(body(index, panel + '.cn-saved-views-panel__name')).toMatch(/white-space: normal;/)
	})

	it('lays the edit view dialog out as DqFilterBewerken draws it', () => {
		const look = '.cn-look-board .cn-saved-view-look:not(.cn-look-nextcloud *)'
		expect(body(board, '.cn-look-board .cn-edit-view__label:not(.cn-look-nextcloud *)')).toMatch(/line-height: normal;/)
		expect(body(board, '.cn-look-board .cn-edit-view__note:not(.cn-look-nextcloud *)')).toMatch(/font-size: 13px;/)
		expect(body(board, look)).toMatch(/gap: 16px;/)
		expect(body(board, look + ' .cn-saved-view-look__icons')).toMatch(/gap: 7px;/)
		expect(body(board, look + ' .cn-saved-view-look__icon')).toMatch(/margin: 0;/)
		expect(body(board, look + ' .cn-saved-view-look__icon:not(.cn-saved-view-look__icon--chosen)')).toMatch(/border-color: var\(--cn-board-control-border\);/)
	})

	it('runs a share row\'s name and kind at a normal line height', () => {
		expect(body(board, '.cn-look-board .cn-saved-view-share__mode:not(.cn-look-nextcloud *)')).toMatch(/line-height: normal;/)
	})
})
