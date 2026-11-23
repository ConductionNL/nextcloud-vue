/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page that asks for the record's rights (`config.permissions`)
 * reads `@self.can` and turns its edit controls off while `can.update` is
 * false. A page that does not ask, or a record without `can`, keeps today's
 * behaviour.
 *
 * @spec openspec/changes/detail-page-record-rights/specs/detail-page-record-rights/spec.md#requirement-a-detail-page-can-read-the-records-rights
 * @spec openspec/changes/detail-page-record-rights/specs/detail-page-record-rights/spec.md#requirement-edit-controls-follow-the-records-update-right
 */

const { mount, shallowMount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default
const CnDetailWidgetHost = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue').default

const schema = { title: 'Case', properties: { title: { type: 'string' } } }

/**
 * @param {object|undefined} can The record's `@self.can`, or undefined for none.
 * @return {object} A case record.
 */
function caseRecord(can) {
	const self = { id: 'c-1' }
	if (can !== undefined) {
		self.can = can
	}
	return { id: 'c-1', title: 'Kapvergunning Lindelaan', '@self': self }
}

const HEADER_ACTIONS = [
	{ id: 'edit-dates', label: 'Edit dates', role: 'edit', type: 'open-modal', target: 'X' },
	{ id: 'update-status', label: 'Update status', role: 'update', type: 'open-modal', target: 'Y' },
	{ id: 'export', label: 'Export', type: 'api-call', url: '/x' },
]

/**
 * @param {object} propsData Extra props.
 * @param {object} record The record in the store.
 * @return {object} The wrapper.
 */
function mountDetail(propsData, record) {
	const store = {
		schemas: { 'dossiq-case': schema },
		objects: { 'dossiq-case': { 'c-1': record } },
		getError: jest.fn().mockReturnValue(null),
	}
	return shallowMount(CnDetailPage, {
		propsData: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'c-1',
			objectStore: store,
			showEditAction: true,
			headerActions: HEADER_ACTIONS,
			...propsData,
		},
	})
}

describe('CnDetailPage — record rights', () => {
	it('asks for @self.can when the page asks for permissions, also with Follow off', () => {
		const wrapper = mountDetail({ permissions: true, follow: false }, caseRecord({ update: true }))
		expect(wrapper.vm.readExtend).toContain('@self.can')
	})

	it('does not ask for @self.can with Follow off and no permissions, as before', () => {
		const wrapper = mountDetail({ follow: false }, caseRecord({ update: true }))
		expect(wrapper.vm.readExtend).not.toContain('@self.can')
	})

	it('🔴 withdraws Edit and the edit-role header actions while can.update is false', () => {
		const wrapper = mountDetail({ permissions: true }, caseRecord({ update: false, 'claim-as-handler': true }))
		expect(wrapper.vm.recordCan).toEqual({ update: false, 'claim-as-handler': true })
		expect(wrapper.vm.recordUpdateDenied).toBe(true)
		expect(wrapper.vm.canEditRecord).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-edit"]').exists()).toBe(false)
		expect(wrapper.vm.effectiveHeaderActions.map((action) => action.id)).toEqual(['export'])
	})

	it('POSITIVE CONTROL: keeps Edit and every header action while can.update is true', () => {
		const wrapper = mountDetail({ permissions: true }, caseRecord({ update: true }))
		expect(wrapper.vm.recordUpdateDenied).toBe(false)
		expect(wrapper.vm.canEditRecord).toBe(true)
		expect(wrapper.vm.effectiveHeaderActions.map((action) => action.id)).toEqual(['edit-dates', 'update-status', 'export'])
	})

	it('keeps today\'s behaviour for a record without can', () => {
		const wrapper = mountDetail({ permissions: true }, caseRecord(undefined))
		expect(wrapper.vm.recordCan).toBe(null)
		expect(wrapper.vm.canEditRecord).toBe(true)
		expect(wrapper.vm.effectiveHeaderActions).toHaveLength(3)
	})

	it('keeps today\'s behaviour on a page that does not ask, whatever the record says', () => {
		const wrapper = mountDetail({}, caseRecord({ update: false }))
		expect(wrapper.vm.recordUpdateDenied).toBe(false)
		expect(wrapper.vm.canEditRecord).toBe(true)
		expect(wrapper.vm.effectiveHeaderActions).toHaveLength(3)
	})

	it('tells the widgets below the page that updates are refused', () => {
		const wrapper = mountDetail({ permissions: true }, caseRecord({ update: false }))
		const provided = wrapper.vm.$.provides
		expect(provided.cnRecordEdit.available).toBe(false)
		expect(provided.cnRecordEdit.denied).toBe(true)
		expect(provided.cnRecordCan.value).toEqual({ update: false })
	})
})

describe('CnDetailWidgetHost — inline editors follow the record', () => {
	/**
	 * @param {object} widget The widget definition.
	 * @param {object|null} cnRecordEdit What the page provides.
	 * @return {boolean} The data widget's `editable`.
	 */
	function dataEditable(widget, cnRecordEdit) {
		const wrapper = mount(CnDetailWidgetHost, {
			props: { widget, schemaObject: { type: 'object', properties: { title: { type: 'string' } } }, object: { title: 'A case' }, objectId: 'c-1' },
			global: { stubs: { CnIcon: true, CnObjectDataWidget: { name: 'CnObjectDataWidget', props: ['editable'], template: '<div />' } }, provide: cnRecordEdit ? { cnRecordEdit } : {} },
		})
		return wrapper.findComponent({ name: 'CnObjectDataWidget' }).props('editable')
	}

	it('🔴 turns inline editing off while the record refuses updates', () => {
		expect(dataEditable({ id: 'd', type: 'data' }, { available: false, denied: true })).toBe(false)
	})

	it('keeps inline editing on otherwise, also where the page has no Edit button', () => {
		expect(dataEditable({ id: 'd', type: 'data' }, { available: false, denied: false })).toBe(true)
		expect(dataEditable({ id: 'd', type: 'data' }, null)).toBe(true)
		expect(dataEditable({ id: 'd', type: 'data', content: { editable: false } }, null)).toBe(false)
	})
})
