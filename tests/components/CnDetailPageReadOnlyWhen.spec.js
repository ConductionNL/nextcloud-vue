/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page can make a record read-only by a condition on the record
 * (`readOnlyWhen`): a record merged into another loses Edit, the edit-role
 * header actions and the inline editors, as when `can.update` is false.
 *
 * @spec openspec/changes/detail-read-only-when/specs/detail-page/spec.md#requirement-a-detail-page-can-make-a-record-read-only-by-a-condition
 */

const { shallowMount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const schema = { title: 'Contact', properties: { title: { type: 'string' } } }

const HEADER_ACTIONS = [
	{ id: 'edit-details', label: 'Edit details', role: 'edit', type: 'open-modal', target: 'X' },
	{ id: 'export', label: 'Export', type: 'api-call', url: '/x' },
]

const MERGED = { field: 'mergedInto', op: 'notEmpty' }

/**
 * @param {object} propsData Extra props.
 * @param {object} record The record in the store.
 * @return {object} The wrapper.
 */
function mountDetail(propsData, record) {
	const store = {
		schemas: { 'app-contact': schema },
		objects: { 'app-contact': { 'r-1': { id: 'r-1', title: 'A. Jansen', '@self': { id: 'r-1' }, ...record } } },
		getError: jest.fn().mockReturnValue(null),
	}
	return shallowMount(CnDetailPage, {
		propsData: {
			title: 'Contact',
			register: 'app',
			schema: 'contact',
			objectId: 'r-1',
			objectStore: store,
			showEditAction: true,
			headerActions: HEADER_ACTIONS,
			...propsData,
		},
	})
}

describe('CnDetailPage — readOnlyWhen', () => {
	it('🔴 withdraws Edit, the edit-role actions and inline editing while the condition holds', () => {
		const wrapper = mountDetail({ readOnlyWhen: MERGED }, { mergedInto: 'r-2' })
		expect(wrapper.vm.recordUpdateDenied).toBe(true)
		expect(wrapper.vm.canEditRecord).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-edit"]').exists()).toBe(false)
		expect(wrapper.vm.effectiveHeaderActions.map((action) => action.id)).toEqual(['export'])
		expect(wrapper.vm.$.provides.cnRecordEdit.denied).toBe(true)
	})

	it('POSITIVE CONTROL: keeps Edit while the condition does not hold', () => {
		const wrapper = mountDetail({ readOnlyWhen: MERGED }, { mergedInto: '' })
		expect(wrapper.vm.recordUpdateDenied).toBe(false)
		expect(wrapper.vm.canEditRecord).toBe(true)
		expect(wrapper.vm.effectiveHeaderActions).toHaveLength(2)
	})

	it('changes nothing without the option', () => {
		const wrapper = mountDetail({}, { mergedInto: 'r-2' })
		expect(wrapper.vm.canEditRecord).toBe(true)
		expect(wrapper.vm.effectiveHeaderActions).toHaveLength(2)
	})

	it('reads an equality condition', () => {
		expect(mountDetail({ readOnlyWhen: { field: 'status', value: 'archived' } }, { status: 'archived' }).vm.canEditRecord).toBe(false)
		expect(mountDetail({ readOnlyWhen: { field: 'status', value: 'archived' } }, { status: 'open' }).vm.canEditRecord).toBe(true)
	})

	it('still follows can.update false on a page that asks for rights', () => {
		const wrapper = mountDetail({ permissions: true, readOnlyWhen: MERGED }, { '@self': { id: 'r-1', can: { update: false } } })
		expect(wrapper.vm.recordUpdateDenied).toBe(true)
	})
})
