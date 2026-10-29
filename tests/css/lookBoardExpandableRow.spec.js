/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An expandable row in the board look as PqPipelines draws it: the toggle 14px
 * before the title without Nextcloud's button margin, 40px header buttons and
 * menu, the order number 12px bold in the soft ink, the open toggle's chevron
 * in the light primary ink and the add action a light primary pill.
 *
 * @spec openspec/changes/expandable-row-as-drawn/specs/expandable-row-as-drawn/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: expandable rows', () => {
	it('sets the toggle 14px before the title, without a margin', () => {
		expect(rule('.cn-look-board .cn-expandable-row .cn-expandable-row__head')).toMatch(/gap: 14px;/)
		expect(rule('.cn-look-board .cn-expandable-row .cn-expandable-row__toggle')).toMatch(/margin: 0 !important;/)
		expect(rule('.cn-look-board .cn-expandable-row--open .cn-expandable-row__toggle')).toMatch(/color: var\(--color-primary-element-light-text\);/)
	})

	it('draws the header buttons and the row menu 40px high', () => {
		expect(rule('.cn-look-board .cn-expandable-row .cn-expandable-row__actions > .button-vue')).toMatch(/height: var\(--cn-board-control-height\) !important;/)
		const menu = rule('.cn-look-board .cn-expandable-row .cn-expandable-row__actions .cn-row-actions--board .button-vue')
		expect(menu).toMatch(/width: var\(--cn-board-control-height\) !important;/)
		expect(menu).toMatch(/height: var\(--cn-board-control-height\) !important;/)
	})

	it('draws the order number 12px bold in the soft ink', () => {
		const order = rule('.cn-look-board .cn-expandable-row .cn-expandable-row__order')
		expect(order).toMatch(/font-size: 12px;/)
		expect(order).toMatch(/font-weight: 700;/)
		expect(order).toMatch(/color: var\(--cn-board-text-soft\);/)
	})

	it('draws the add action as a light primary pill', () => {
		const add = rule('.cn-look-board .cn-expandable-row .cn-expandable-row__foot-action.button-vue')
		expect(add).toMatch(/border: 0 !important;/)
		expect(add).toMatch(/border-radius: 17px !important;/)
		expect(add).toMatch(/background: var\(--color-primary-element-light\) !important;/)
		expect(add).toMatch(/color: var\(--color-primary-element-light-text\) !important;/)
	})
})
