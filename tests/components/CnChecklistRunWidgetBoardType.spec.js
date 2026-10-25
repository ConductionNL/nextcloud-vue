/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A checklist question reads as board DqInspectie draws it: a 15px/600
 * legend on a 1.2 line, 14px help, the options 15px regular text (live drew
 * them bold), a 14px/600 section heading.
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'), 'utf8')
	.split('<style')[1]
	.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnChecklistRunWidget type', () => {
	it('sets the legend 15px/600 on a 1.2 line', () => {
		const legend = rule('.cn-checklist-run__legend')
		expect(legend).toContain('font-size: 15px')
		expect(legend).toContain('line-height: 1.2')
	})

	it('reads the options as 15px regular text', () => {
		const choice = rule('.cn-checklist-run__choice')
		expect(choice).toContain('font-size: 15px')
		expect(choice).toContain('font-weight: 400')
	})

	it('sets the help 14px and the section heading 14px/600', () => {
		expect(rule('.cn-checklist-run__help')).toContain('font-size: 14px')
		expect(rule('.cn-checklist-run__group')).toContain('font-size: 14px')
	})
})
