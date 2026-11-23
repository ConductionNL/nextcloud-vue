/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The action dialog's checkbox field as DqArchiveren draws it after #371:
 * a white box with the 2px primary edge, the checkbox at the inset 12px
 * before an 18px label line (r26a: label 32px in vs 46, 8px down vs 14,
 * line 22.5 vs 18).
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnActionDialog/CnActionDialog.vue'), 'utf8')

/**
 * @param {string} selector The selector as written.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = sfc.indexOf(selector + ' {')
	return at === -1 ? '' : sfc.slice(at, sfc.indexOf('}', at))
}

describe('CnActionDialog checkbox field', () => {
	it('is a white box with the primary edge', () => {
		const box = rule('\n.cn-action-dialog__checkbox')
		expect(box).toContain('background: var(--color-main-background)')
		expect(box).toContain('border: 2px solid var(--color-primary-element)')
	})

	it('drops the switch row padding and sets the label 12px after the box on an 18px line', () => {
		const row = rule('.cn-action-dialog__checkbox :deep(.checkbox-content)')
		expect(row).toContain('padding: 0')
		expect(row).toContain('gap: 12px')
		expect(rule('.cn-action-dialog__checkbox-label')).toContain('line-height: 1.2')
	})

	it('keeps its 12px 14px inset over the switch root padding', () => {
		// NcCheckboxRadioSwitch's own `.checkbox-radio-switch { padding: 0 }` has the same
		// weight and is injected again by every bundle that ships it, so a one-class rule loses.
		expect(rule('\n.cn-action-dialog__checkbox.checkbox-radio-switch')).toContain('padding: 12px 14px')
	})
})
