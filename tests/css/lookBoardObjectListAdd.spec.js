/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a list card's Add is a 40px title-row button and the
 * list's footer Add bar is hidden in the card (DqZaakGerelateerd, DqZaakTaken).
 * The Nextcloud look keeps ADR-062's footer bar: the base rule still draws it
 * and every board rule that touches it is scoped away from the Nextcloud look.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-object-list-add-button/specs/board-object-list-add-button/spec.md#requirement-the-board-look-draws-a-cards-add-as-a-title-row-button
 */
const fs = require('fs')
const path = require('path')

const read = (rel) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const detail = read('src/css/look-board-detail.css')
const widget = read('src/components/CnObjectListWidget/CnObjectListWidget.vue')

function bodyOf(css, selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('a list card\'s Add', () => {
	it('is hidden as a footer bar in a board-look catalog card', () => {
		const body = bodyOf(detail, '.cn-look-board .cn-detail-page__catalog-card:not(.cn-look-nextcloud *) .cn-object-list-widget__add')
		expect(body).toContain('display: none;')
	})

	it('is a 40px button in the board-look title row', () => {
		const body = bodyOf(detail, '.cn-look-board .cn-widget-wrapper__actions .button-vue.cn-detail-page__catalog-add:has(> .button-vue__wrapper > .button-vue__text:not(:empty)):where(:not(.cn-look-nextcloud *))')
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
	})

	it('stays the divider-topped footer bar in the Nextcloud look', () => {
		const body = bodyOf(widget, '.cn-object-list-widget__add')
		expect(body).toContain('border-top: 1px solid var(--color-border);')
		const boardRules = detail.split('}').map((r) => r.split('{')[0]).filter((sel) => sel.includes('.cn-object-list-widget__add') && sel.includes('display'))
		expect(boardRules).toEqual([])
		for (const sel of detail.split('}').map((r) => r.split('{')[0].trim()).filter((s) => s.includes('cn-detail-page__catalog-card') && s.includes('cn-object-list-widget__add'))) {
			expect(sel).toMatch(/^\.cn-look-board /)
			expect(sel).toContain(':not(.cn-look-nextcloud *)')
		}
	})
})
