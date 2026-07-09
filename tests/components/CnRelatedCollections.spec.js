/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnRelatedCollections — declarative related-object list sections.
 * Each entry maps to a CnObjectListWidget content blob (which resolves
 * @objectId tokens from the cnObjectContext inject). Here we stub the widget
 * and assert the section titles + content mapping.
 */

import { mount } from '@vue/test-utils'
import CnRelatedCollections from '../../src/components/CnRelatedCollections/CnRelatedCollections.vue'

const ListStub = {
	name: 'CnObjectListWidget',
	props: ['content'],
	template: '<div class="list-stub" :data-register="content.register" />',
}

describe('CnRelatedCollections', () => {
	it('renders a titled section per collection with a mapped content blob', () => {
		const wrapper = mount(CnRelatedCollections, {
			propsData: {
				collections: [
					{
						title: 'Running cases',
						register: 'pipelinq', schema: 'case',
						filter: { client: '@objectId', status: 'open' },
						columns: [{ key: 'title', label: 'Case' }],
						limit: 5,
						rowRoute: 'cases-detail',
					},
					{
						title: 'Contracts',
						register: 'pipelinq', schema: 'contract',
						filter: { client: '@objectId' },
					},
				],
			},
			stubs: { CnObjectListWidget: ListStub },
		})
		const sections = wrapper.findAll('[data-testid^="cn-related-collection-"]')
		expect(sections.length).toBe(2)
		expect(wrapper.find('[data-testid="cn-related-collection-0"]').text()).toContain('Running cases')

		const lists = wrapper.findAllComponents(ListStub)
		expect(lists.at(0).props('content')).toMatchObject({
			register: 'pipelinq',
			schema: 'case',
			filter: { client: '@objectId', status: 'open' },
			limit: 5,
			rowRoute: 'cases-detail',
		})
		// default limit applied when omitted
		expect(lists.at(1).props('content').limit).toBe(10)
	})

	it('renders nothing when there are no collections', () => {
		const wrapper = mount(CnRelatedCollections, {
			propsData: { collections: [] },
			stubs: { CnObjectListWidget: ListStub },
		})
		expect(wrapper.find('[data-testid="cn-related-collections"]').exists()).toBe(false)
	})

	it('re-emits row-click with the owning collection + index', () => {
		const wrapper = mount(CnRelatedCollections, {
			propsData: {
				collections: [{ title: 'Cases', register: 'r', schema: 's', filter: {} }],
			},
			stubs: { CnObjectListWidget: ListStub },
		})
		wrapper.findComponent(ListStub).vm.$emit('row-click', { id: 'row-1' })
		const payload = wrapper.emitted('row-click')[0][0]
		expect(payload.row).toEqual({ id: 'row-1' })
		expect(payload.index).toBe(0)
		expect(payload.collection.schema).toBe('s')
	})
})
