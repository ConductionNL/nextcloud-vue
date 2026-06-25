/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectDataWidget's full-form Edit action — alongside inline
 * editing, an Edit action opens CnFormDialog whose confirm persists the merged
 * object via the same objectStore path.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const SCHEMA = { properties: { title: { type: 'string' }, status: { type: 'string' } } }

function mountWidget(props = {}) {
	return shallowMount(CnObjectDataWidget, {
		propsData: {
			schema: SCHEMA,
			objectData: { id: '1', title: 'Old', status: 'open' },
			objectType: 'thing',
			...props,
		},
		stubs: { CnWidgetWrapper: { template: '<div><slot name="action-items" /><slot /></div>' }, CnFormDialog: true, CnObjectMetadataModal: true },
		mocks: { t: (_app, s) => s },
	})
}

describe('CnObjectDataWidget — Edit action', () => {
	it('onEditConfirm saves the form merged onto the object via the store, then closes', async () => {
		const saveObject = jest.fn(async () => ({ id: '1', title: 'New', status: 'done' }))
		const store = { saveObject, getError: jest.fn() }
		const w = mountWidget({ store })
		w.vm.editModalOpen = true
		await w.vm.onEditConfirm({ title: 'New', status: 'done' })
		expect(saveObject).toHaveBeenCalledWith('thing', { id: '1', title: 'New', status: 'done' })
		expect(w.vm.editModalOpen).toBe(false)
		expect(w.emitted('saved')).toBeTruthy()
	})

	it('onEditConfirm falls back to a save event when no store/objectType', async () => {
		const w = mountWidget({ objectType: '' })
		w.vm.editModalOpen = true
		await w.vm.onEditConfirm({ title: 'New' })
		expect(w.vm.editModalOpen).toBe(false)
		expect(w.emitted('save')[0][0]).toEqual({ id: '1', title: 'New', status: 'open' })
	})

	it('shows the Edit action when editable, hides it when not', () => {
		const editable = mountWidget({ editable: true })
		expect(editable.text()).toContain('Edit')
		const readonly = mountWidget({ editable: false })
		expect(readonly.text()).not.toContain('Edit')
	})
})
