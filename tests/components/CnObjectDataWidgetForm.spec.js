/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidgetForm from '../../src/components/CnObjectDataWidgetForm/CnObjectDataWidgetForm.vue'

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
})
