/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqInspectie r36: the question cards start 358.5 from the page top (live
 * 368.5) and are 253 tall (live 267). The rules that drew them as the board
 * lost the cascade on :8080: a theme's label weight with !important, the board
 * look's 18px radio rule (0,4,1), the body's 22.5px leading on the note label
 * and the position line, and Nextcloud's 3px textarea margin.
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

describe('CnChecklistRunWidget r36', () => {
	it('keeps an option at 400 against a theme label weight set with !important', () => {
		expect(rule('.cn-checklist-run__choice')).toContain('font-weight: 400 !important')
		expect(rule('.cn-checklist-run__choice')).toContain('min-height: 23px')
	})

	it('draws the radio at 20px over the board look radio rule', () => {
		const radio = rule('.cn-checklist-run__choice.cn-checklist-run__choice.cn-checklist-run__choice input[type="radio"]')
		expect(radio).toContain('height: 20px')
		expect(radio).toContain('width: 20px')
		expect(radio).toContain('min-height: 20px')
	})

	it('sets the note label on a normal line and the note without margin', () => {
		expect(rule('.cn-checklist-run__note-label')).toContain('line-height: 1.2')
		expect(rule('.cn-checklist-run__text.cn-checklist-run__text')).toContain('margin: 0')
	})

	it('draws the position at 13px on a 17px line and the group on a normal line', () => {
		const position = rule('.cn-checklist-run__position')
		expect(position).toContain('font-size: 13px')
		expect(position).toContain('line-height: 17px')
		expect(rule('.cn-checklist-run__group')).toContain('line-height: normal')
	})
})
