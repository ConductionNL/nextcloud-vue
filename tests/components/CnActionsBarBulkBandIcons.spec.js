/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A bulk action's `icon` draws before its label in the bulk band, as the
 * boards draw "Andere behandelaar", "Opschorten" and "Termijn verlengen"
 * (DqZaken, DqZakenSorteren, DqFilterInMenu). The band dropped the icon the
 * manifest declared.
 *
 * @spec openspec/changes/bulk-band-action-icons/specs/bulk-band/spec.md#requirement-a-bulk-actions-icon-draws-in-the-band
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcButton: { props: ['disabled'], template: '<button type="button" :disabled="disabled"><span class="icon-slot"><slot name="icon" /></span><slot /></button>' },
	NcActions: true,
	CnBuildiqEditButton: true,
	CnIcon: { name: 'CnIcon', props: ['name', 'size'], template: '<i class="cn-icon-stub" :data-name="name" />' },
}

function mountBar(bulkActions) {
	return mount(CnActionsBar, {
		props: { selectable: true, selectedIds: ['a'], bulkActions, showMassCopy: false, showMassDelete: false, bulkNoun: 'cases' },
		global: { provide: { cnLook: 'board' }, stubs },
	})
}

describe('bulk band action icons', () => {
	it('draws the declared icon before the label', () => {
		const w = mountBar([{ id: 'suspend', label: 'Suspend', icon: 'PauseCircleOutline' }])
		const button = w.find('[data-testid="cn-bulk-band"] button')
		const icon = button.find('.cn-icon-stub')
		expect(icon.exists()).toBe(true)
		expect(icon.attributes('data-name')).toBe('PauseCircleOutline')
	})

	it('draws no icon for an action without one', () => {
		const w = mountBar([{ id: 'assign', label: 'Assign' }])
		expect(w.find('[data-testid="cn-bulk-band"] .cn-icon-stub').exists()).toBe(false)
	})
})
