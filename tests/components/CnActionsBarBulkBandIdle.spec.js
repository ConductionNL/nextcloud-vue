/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaken and DqWerkbord draw the bulk band ("Met de geselecteerde zaken")
 * before anything is selected, its buttons disabled until there is a
 * selection. `bulkBandAlways` (CnIndexPage `config.bulkBandAlways`) asks for
 * that; without it the band shows only with a selection, as before.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const stubs = { NcButton: { props: ['disabled'], template: '<button type="button" :disabled="disabled"><slot /></button>' }, NcActions: true, CnBuildiqEditButton: true }
const BULK = [{ id: 'assign', label: 'Assign' }, { id: 'status', label: 'Change status' }]

/**
 * Mount the board bar.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountBar(props = {}) {
	return mount(CnActionsBar, {
		props: { selectable: true, selectedIds: [], bulkActions: BULK, showMassCopy: false, showMassDelete: false, bulkNoun: 'cases', ...props },
		global: { provide: { cnLook: 'board' }, stubs },
	})
}

const band = (w) => w.find('[data-testid="cn-bulk-band"]')

describe('board bulk band before a selection', () => {
	it('draws the band with its buttons disabled when asked, before anything is selected', () => {
		const w = mountBar({ bulkBandAlways: true })
		expect(band(w).exists()).toBe(true)
		expect(band(w).classes()).toContain('cn-actions-bar__band--idle')
		expect(band(w).find('strong').text()).toBe('With the selected cases')
		expect(band(w).findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
	})

	it('enables the buttons once rows are selected', () => {
		const w = mountBar({ bulkBandAlways: true, selectedIds: ['a'] })
		expect(band(w).classes()).not.toContain('cn-actions-bar__band--idle')
		expect(band(w).findAll('button').every((b) => b.attributes('disabled') === undefined)).toBe(true)
	})

	it('draws no band before a selection without the option, or with nothing to offer', () => {
		expect(band(mountBar()).exists()).toBe(false)
		expect(band(mountBar({ bulkBandAlways: true, bulkActions: [] })).exists()).toBe(false)
	})

	it('is a page option CnIndexPage hands the bar', () => {
		const w = mount(CnIndexPage, {
			propsData: { title: 'Zaken', schema: { title: 'Zaak', properties: { title: { type: 'string' } } }, objects: [{ id: '1', title: 'A' }], bulkBandAlways: true },
			global: { stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnActionsBar: { name: 'CnActionsBar', props: ['bulkBandAlways'], template: '<div />' } } },
		})
		expect(w.findComponent({ name: 'CnActionsBar' }).props('bulkBandAlways')).toBe(true)
	})
})
