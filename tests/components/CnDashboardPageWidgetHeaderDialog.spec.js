/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard card's header action dispatches through the page's dispatcher
 * (`cnDispatchAction`, provided by CnPageRenderer), as a detail page card's
 * does, so an `open-modal` action opens the app's registry dialog
 * (DqCatalogus "Importeren" on the Uit de Store card). Without a provided
 * dispatcher it keeps dispatching on its own, as before.
 *
 * @spec openspec/changes/dashboard-card-action-dialog/specs/dashboard-page/spec.md#requirement-a-dashboard-card-header-action-dispatches-through-the-page
 */
import { shallowMount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const IMPORT = { type: 'open-modal', target: 'CaseTypeImportDialog' }
const WIDGETS = [{ id: 'store', type: 'record-list', title: 'From the Store', headerActions: [{ label: 'Import', icon: 'TrayArrowUp', action: IMPORT }] }]
const LAYOUT = [{ id: '1', widgetId: 'store', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }]

/**
 * @param {object} provide What the page is given.
 * @return {object} The wrapper.
 */
function mountDash(provide = {}) {
	return shallowMount(CnDashboardPage, {
		propsData: { title: 'Catalogue', widgets: WIDGETS, layout: LAYOUT },
		provide,
	})
}

describe('CnDashboardPage card header actions', () => {
	it('dispatch through the provided page dispatcher, so open-modal opens a dialog', () => {
		const dispatch = jest.fn()
		const wrapper = mountDash({ cnDispatchAction: dispatch })
		const [action] = wrapper.vm.getWidgetHeaderActions(LAYOUT[0])
		expect(action.label).toBe('Import')
		action.run()
		expect(dispatch).toHaveBeenCalledWith(IMPORT)
	})

	it('still resolve without a provided dispatcher', () => {
		const wrapper = mountDash()
		const [action] = wrapper.vm.getWidgetHeaderActions(LAYOUT[0])
		expect(typeof action.run).toBe('function')
	})
})
