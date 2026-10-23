/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The side panel's close button is named "Close side panel" (nl "Zijpaneel
 * sluiten"), as the boards name it (DqZakenSorteren, DqFilterBeheren), where
 * NcAppSidebar says "Close sidebar" ("Zijbalk sluiten"). NcAppSidebar keeps
 * the name in its `closeTranslated` data, which drives both the button's
 * aria-label and its title.
 *
 * @spec openspec/changes/side-panel-close-label/specs/side-panel-close-label/spec.md
 */
import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'
import CnObjectSidebar from '../../src/components/CnObjectSidebar/CnObjectSidebar.vue'

const NcAppSidebar = {
	name: 'NcAppSidebar',
	data: () => ({ closeTranslated: 'Close sidebar' }),
	template: '<div><slot /></div>',
}

describe('the side panel close button', () => {
	it('is named "Close side panel" on the index side panel', () => {
		const w = mount(CnIndexSidebar, {
			props: { open: true, schema: { properties: {} }, showMetadata: false },
			global: { stubs: { NcAppSidebar, NcAppSidebarTab: { template: '<div><slot /></div>' }, NcButton: true, NcCheckboxRadioSwitch: true, NcTextField: true, NcSelect: true, NcPopover: true, CnDateRangePicker: true, CnIcon: true } },
		})
		expect(w.findComponent({ name: 'NcAppSidebar' }).vm.closeTranslated).toBe('Close side panel')
	})

	it('is named "Close side panel" on the object side panel', () => {
		const w = mount(CnObjectSidebar, {
			propsData: { objectType: 'case', objectId: 'c1', register: 'dossiq', schema: 'case', useRegistry: false },
			stubs: { NcAppSidebar, CnFilesTab: true, CnNotesTab: true, CnTagsTab: true, CnTasksTab: true, CnAuditTrailTab: true },
		})
		expect(w.findComponent({ name: 'NcAppSidebar' }).vm.closeTranslated).toBe('Close side panel')
	})
})
