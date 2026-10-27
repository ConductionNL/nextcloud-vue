/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqInspectie r32: the photo button is the board's 14px/600 control with a
 * camera before its label, and a note field is two lines on the normal line
 * height, 8px 12px in (54px).
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'), 'utf8')
const css = sfc.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnChecklistRunWidget r32', () => {
	it('draws the photo button with a camera, 14px/600, 8px gap', () => {
		const label = sfc.slice(sfc.indexOf('<label class="cn-checklist-run__photo-button">'), sfc.indexOf('</label>', sfc.indexOf('<label class="cn-checklist-run__photo-button">')))
		expect(label).toContain('<CameraOutline :size="16" />')
		expect(rule('.cn-checklist-run__photo-button.cn-checklist-run__photo-button')).toContain('font-size: 14px')
		expect(rule('.cn-checklist-run__photo-button.cn-checklist-run__photo-button')).toContain('font-weight: 600 !important')
		expect(rule('.cn-checklist-run__photo-button')).toContain('gap: 8px')
	})

	it('sets a note on the normal line height, 8px 12px in', () => {
		const note = rule('.cn-checklist-run__text.cn-checklist-run__text')
		expect(note).toContain('line-height: normal')
		expect(note).toContain('padding: 8px 12px !important')
	})
})
