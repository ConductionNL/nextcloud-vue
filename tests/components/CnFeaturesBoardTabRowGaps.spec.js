/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqRoadmap: the tabs stand 4px apart and the status chips 8px apart
 * (live drew 7 and 11: Nextcloud's core sheet gives every plain button a 3px
 * margin, which the single-class rules did not outrank), and the Actions menu
 * beside the tabs keeps the strip's 34px with 12px padding instead of the 40px
 * of a labelled header menu.
 *
 * @spec openspec/changes/features-board-tab-row-gaps/specs/features-board-tab-row-gaps/spec.md#requirement-the-features-boards-tab-row-keeps-the-boards-gaps-and-34px-actions-menu
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
const look = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} css The stylesheet.
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function rule(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('CnFeaturesBoard tab row gaps', () => {
	it('clears the core button margin on the tabs with a two-class rule', () => {
		expect(rule(style, '.cn-features-board__tabs .cn-features-board__tab')).toMatch(/margin:\s*0 0 -1px;/)
	})

	it('clears the core button margin on the status chips with a two-class rule', () => {
		expect(rule(style, '.cn-features-board__filter--chips .cn-features-board__filter-option')).toMatch(/margin:\s*0;/)
	})

	it('keeps the Actions menu beside the tabs out of the 40px labelled-menu rule', () => {
		const generic = look.match(/\.cn-look-board \.action-item__menutoggle\.button-vue:has\([^{]*\{/)
		expect(generic).not.toBeNull()
		expect(generic[0]).toContain(':where(:not(.cn-features-board__tab-actions *))')
	})

	it('draws that menu at 34px with 12px padding under the board look', () => {
		const body = rule(look, '.cn-look-board .cn-features-board__tab-actions:not(.cn-look-nextcloud *) .button-vue')
		expect(body).toMatch(/--button-padding:\s*12px;/)
		expect(body).toMatch(/min-height:\s*34px;/)
		expect(body).toMatch(/block-size:\s*34px;/)
	})
})
