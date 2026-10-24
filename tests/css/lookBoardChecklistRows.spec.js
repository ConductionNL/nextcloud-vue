/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak: a board checklist's boxes sit at the card inset, 12px apart, the
 * label in weight 600. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-checklist-rows/specs/checklist-widget/spec.md#requirement-a-board-checklist-sits-at-the-card-inset
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: checklist rows', () => {
	it('stacks the items 12px apart', () => {
		expect(rule('.cn-look-board .cn-checklist-widget__items')).toContain('gap: 12px;')
	})

	it('drops Nextcloud\'s box padding and 34px rows', () => {
		const content = rule('.cn-look-board .cn-checklist-widget__item .checkbox-content')
		expect(content).toContain('padding: 0;')
		expect(content).toContain('min-height: 20px;')
	})

	it('writes the label in weight 600', () => {
		expect(rule('.cn-look-board .cn-checklist-widget__item .checkbox-content__text')).toContain('font-weight: 600;')
	})
})
