/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The bulk band can take another shape per view (`bulkBandViews`): DqWerkbord
 * draws "1 zaak geselecteerd · Status wijzigen · Annuleren" over the board,
 * only while cards are selected, where the table draws the full band.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const BULK = [
	{ id: 'reassign', label: 'Give to another handler' },
	{ id: 'transition', label: 'Move to another status' },
	{ id: 'suspend', label: 'Suspend' },
]
const VIEWS = { board: { lead: { one: '{count} case selected', other: '{count} cases selected' }, actions: [{ id: 'transition', label: 'Change status' }], cancel: true } }

const BarStub = { name: 'CnActionsBar', props: ['bulkActions', 'bulkLead', 'bulkCancel', 'bulkBandAlways', 'showMassCopy', 'showMassDelete', 'bulkHint'], template: '<div />' }

/**
 * @param {string} viewMode The view mode.
 * @param {string[]} selected Selected ids.
 * @return {object} The actions bar stub.
 */
function bar(viewMode, selected = []) {
	const w = mount(CnIndexPage, {
		propsData: {
			title: 'Zaken',
			schema: { title: 'Zaak', properties: { title: { type: 'string' } } },
			objects: [{ id: '1', title: 'A' }, { id: '2', title: 'B' }],
			bulkActions: BULK,
			bulkBandAlways: true,
			bulkHint: 'See what changes first.',
			bulkBandViews: VIEWS,
			selectedIds: selected,
			viewMode,
		},
		global: { stubs: { CnDataTable: true, CnCardGrid: true, CnBoardView: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnActionsBar: BarStub } },
	})
	return w.findComponent({ name: 'CnActionsBar' })
}

describe('bulkBandViews on the index page', () => {
	it('keeps the full band in a view without its own shape', () => {
		const b = bar('table')
		expect(b.props('bulkActions').map((a) => a.id)).toEqual(['reassign', 'transition', 'suspend'])
		expect(b.props('bulkLead')).toBe('')
		expect(b.props('bulkCancel')).toBe(false)
		expect(b.props('bulkBandAlways')).toBe(true)
	})

	it('draws the view\'s shape on the board: its actions, its lead, a cancel, no idle band', () => {
		const b = bar('board', ['1'])
		expect(b.props('bulkActions').map((a) => [a.id, a.label])).toEqual([['transition', 'Change status']])
		expect(b.props('bulkLead')).toBe('1 case selected')
		expect(b.props('bulkCancel')).toBe(true)
		expect(b.props('bulkBandAlways')).toBe(false)
		expect(b.props('showMassCopy')).toBe(false)
		expect(b.props('showMassDelete')).toBe(false)
		expect(b.props('bulkHint')).toBe('')
	})

	it('counts in the plural', () => {
		expect(bar('board', ['1', '2']).props('bulkLead')).toBe('2 cases selected')
	})
})

describe('CnActionsBar with a lead and a cancel', () => {
	const stubs = { NcButton: { props: ['disabled'], template: '<button type="button" :disabled="disabled"><slot /></button>' }, NcActions: true, CnBuildiqEditButton: true }

	it('reads the lead it is given and clears the selection on cancel', async () => {
		const w = mount(CnActionsBar, {
			props: { selectable: true, selectedIds: ['1'], bulkActions: [{ id: 'transition', label: 'Change status' }], showMassCopy: false, showMassDelete: false, bulkLead: '1 case selected', bulkCancel: true },
			global: { provide: { cnLook: 'board' }, stubs },
		})
		const band = w.find('[data-testid="cn-bulk-band"]')
		expect(band.find('strong').text()).toBe('1 case selected')
		const cancel = band.find('[data-testid="cn-bulk-band-cancel"]')
		expect(cancel.text()).toBe('Cancel')
		await cancel.trigger('click')
		expect(w.emitted('clear-selection')).toBeTruthy()
	})
})
