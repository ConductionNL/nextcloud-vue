/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqBiExport "Bestemming": the destination's name, and under it its
 * type in words ("Datawarehouse" / "PostgreSQL"), read off the record the
 * cell resolves.
 *
 * @spec openspec/changes/fk-resolve-secondary-line/specs/fk-resolve-secondary-line/spec.md#requirement-a-reference-cell-can-carry-a-muted-line-from-the-record-it-resolves
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(),
}))

const { useObjectStore } = require('../../src/store/useObjectStore.js')
const CnFkResolveCell = require('../../src/components/CnFkResolveCell/CnFkResolveCell.vue').default

function storeWith(objects) {
	return {
		objects,
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn().mockResolvedValue(null),
	}
}

const props = {
	register: 'pipelinq',
	schema: 'exportDestination',
	labelField: 'name',
	secondaryTemplate: '{type}',
	secondaryLabels: { type: { postgres: 'PostgreSQL', azure_data_lake: 'Azure Data Lake' } },
}

describe('CnFkResolveCell secondary line', () => {
	it('draws the resolved record\'s type in words beneath its name', async () => {
		useObjectStore.mockReturnValue(storeWith({ 'pipelinq/exportDestination': { d1: { name: 'Datawarehouse', type: 'postgres' } } }))
		const wrapper = mount(CnFkResolveCell, { propsData: { ...props, value: 'd1' } })
		await flushPromises()
		expect(wrapper.find('.cn-fk-resolve-cell__label').text()).toBe('Datawarehouse')
		expect(wrapper.find('.cn-fk-resolve-cell__secondary').text()).toBe('PostgreSQL')
	})

	it('falls back to the stored value without a label for it', async () => {
		useObjectStore.mockReturnValue(storeWith({ 'pipelinq/exportDestination': { d1: { name: 'Bucket', type: 's3' } } }))
		const wrapper = mount(CnFkResolveCell, { propsData: { ...props, value: 'd1' } })
		await flushPromises()
		expect(wrapper.find('.cn-fk-resolve-cell__secondary').text()).toBe('s3')
	})

	it('draws one line without a secondary template', async () => {
		useObjectStore.mockReturnValue(storeWith({ 'pipelinq/exportDestination': { d1: { name: 'Datawarehouse', type: 'postgres' } } }))
		const wrapper = mount(CnFkResolveCell, { propsData: { register: 'pipelinq', schema: 'exportDestination', labelField: 'name', value: 'd1' } })
		await flushPromises()
		expect(wrapper.find('.cn-fk-resolve-cell__secondary').exists()).toBe(false)
		expect(wrapper.text()).toBe('Datawarehouse')
	})
})
