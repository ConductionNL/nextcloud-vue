/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The bulk band's built-in Copy selected and Delete selected draw their icon
 * before the label, and Delete reads in the error ink (PqTicketsSelectie
 * "Selectie kopiëren", "Selectie verwijderen"; also HmAgents, SkApplicaties).
 *
 * @spec openspec/changes/bulk-band-copy-delete-icons/specs/bulk-band/spec.md#requirement-copy-and-delete-selected-draw-their-icon-in-the-band
 */
const fs = require('fs')
const path = require('path')
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcButton: { props: ['disabled'], template: '<button type="button" :disabled="disabled"><span class="icon-slot"><slot name="icon" /></span><slot /></button>' },
	NcActions: true,
	CnBuildiqEditButton: true,
}

function mountBar() {
	return mount(CnActionsBar, {
		props: { selectable: true, selectedIds: ['a'], showMassCopy: true, showMassDelete: true, bulkNoun: 'tickets' },
		global: { provide: { cnLook: 'board' }, stubs },
	})
}

describe('bulk band copy and delete', () => {
	it('draws an icon before Copy selected and Delete selected', () => {
		const buttons = mountBar().findAll('[data-testid="cn-bulk-band"] button')
		const copy = buttons.find((b) => b.text().includes('Copy selected'))
		const del = buttons.find((b) => b.text().includes('Delete selected'))
		expect(copy.find('.icon-slot svg, .icon-slot .material-design-icon').exists()).toBe(true)
		expect(del.find('.icon-slot svg, .icon-slot .material-design-icon').exists()).toBe(true)
		expect(del.classes()).toContain('cn-actions-bar__band-delete')
	})

	it('reads Delete selected in the error ink', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		expect(css).toMatch(/\.cn-actions-bar__band \.cn-actions-bar__band-delete\.button-vue[^{]*\{[^}]*color: var\(--nldesign-component-status-badge-error-color/)
	})
})
