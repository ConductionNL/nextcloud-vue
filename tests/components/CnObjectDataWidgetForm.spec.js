/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidgetForm from '../../src/components/CnObjectDataWidgetForm/CnObjectDataWidgetForm.vue'
import { fetchSchemaProperties } from '../../src/utils/fetchSchemaProperties.js'

jest.mock('../../src/utils/fetchSchemaProperties.js', () => ({
	fetchSchemaProperties: jest.fn(async () => ['title', 'status', 'value', 'internalId']),
}))

describe('CnObjectDataWidgetForm', () => {
	const mount = (content) => shallowMount(CnObjectDataWidgetForm, {
		propsData: { editingWidget: { content } },
	})

	it('builds rows from the schema properties merged with overrides', async () => {
		const w = mount({ register: 'pipelinq', schema: 'lead', overrides: { internalId: { hidden: true } } })
		await w.vm.loadFields()
		expect(w.vm.rows.map((r) => r.key)).toEqual(['title', 'status', 'value', 'internalId'])
		expect(w.vm.rows.find((r) => r.key === 'internalId').hidden).toBe(true)
		expect(w.vm.rows.find((r) => r.key === 'title').editable).toBe(true)
	})

	it('emits only non-default overrides', async () => {
		const w = mount({ register: 'pipelinq', schema: 'lead' })
		await w.vm.loadFields()
		w.vm.setRow('status', 'label', 'State')
		w.vm.setRow('value', 'gridColumn', 2)
		w.vm.setRow('internalId', 'hidden', true)
		w.vm.setRow('title', 'editable', false)
		const overrides = w.vm.buildOverrides()
		expect(overrides).toEqual({
			status: { label: 'State' },
			value: { gridColumn: 2 },
			internalId: { hidden: true },
			title: { editable: false },
		})
	})

	it('validates that register + schema are present', () => {
		const w = mount({ register: '', schema: '' })
		expect(w.vm.validate().length).toBe(1)
		const ok = mount({ register: 'pipelinq', schema: 'lead' })
		expect(ok.vm.validate()).toEqual([])
	})

	it('falls back to injected cnObjectContext when register/schema are empty', async () => {
		fetchSchemaProperties.mockClear()
		const w = shallowMount(CnObjectDataWidgetForm, {
			propsData: { editingWidget: { content: { register: '', schema: '' } } },
			provide: { cnObjectContext: { register: 'ctxReg', schema: 'ctxSchema' } },
		})
		await w.vm.loadFields()
		expect(fetchSchemaProperties).toHaveBeenLastCalledWith('ctxReg', 'ctxSchema')
		// own content register/schema win over the context when set
		const w2 = shallowMount(CnObjectDataWidgetForm, {
			propsData: { editingWidget: { content: { register: 'ownReg', schema: 'ownSchema' } } },
			provide: { cnObjectContext: { register: 'ctxReg', schema: 'ctxSchema' } },
		})
		await w2.vm.loadFields()
		expect(fetchSchemaProperties).toHaveBeenLastCalledWith('ownReg', 'ownSchema')
	})

	it('setColumns applies a layout preset and emits', () => {
		const w = mount({ register: 'pipelinq', schema: 'lead' })
		w.vm.setColumns(1)
		expect(w.vm.columns).toBe(1)
		expect(w.emitted('update:content').slice(-1)[0][0].columns).toBe(1)
	})

	it('drag-reorder stamps sequential order onto the moved rows', async () => {
		const w = mount({ register: 'pipelinq', schema: 'lead' })
		await w.vm.loadFields()
		// Move 'value' (index 2) to the front (index 0)
		w.vm.onDragStart(2)
		w.vm.onDrop(0)
		expect(w.vm.rows.map((r) => r.key)).toEqual(['value', 'title', 'status', 'internalId'])
		expect(w.vm.rows.map((r) => r.order)).toEqual([0, 1, 2, 3])
		// The persisted overrides carry the new order for the reordered keys
		const overrides = w.vm.buildOverrides()
		expect(overrides.value.order).toBe(0)
		expect(overrides.title.order).toBe(1)
	})

	it('onDrop is a no-op when dropping a row onto itself', async () => {
		const w = mount({ register: 'pipelinq', schema: 'lead' })
		await w.vm.loadFields()
		const before = w.vm.rows.map((r) => r.key)
		w.vm.onDragStart(1)
		w.vm.onDrop(1)
		expect(w.vm.rows.map((r) => r.key)).toEqual(before)
	})
})
