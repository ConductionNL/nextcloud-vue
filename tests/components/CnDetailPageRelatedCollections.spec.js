/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage's Primitive-2 wiring: relatedCollections,
 * summaryAggregates, and the relation-link action.
 */

import { mount } from '@vue/test-utils'
import { toRaw } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const RelatedStub = { name: 'CnRelatedCollections', props: ['collections'], template: '<div class="related-stub" />' }
const SummaryStub = { name: 'CnSummaryAggregates', props: ['aggregates'], template: '<div class="summary-stub" />' }
const RelationLinkStub = {
	name: 'CnRelationLinkModal',
	props: ['register', 'schema', 'currentType', 'currentObject', 'fkField', 'allowCreate', 'title', 'selectLabel', 'labelField'],
	template: '<div class="relation-link-stub" />',
}

function makeFakeStore(object) {
	return {
		objects: object ? { 'r-s': { o1: object } } : {},
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

const stubs = {
	CnRelatedCollections: RelatedStub,
	CnSummaryAggregates: SummaryStub,
	CnRelationLinkModal: RelationLinkStub,
}

function mountPage(extraProps = {}, object = { id: 'o1', status: 'open' }) {
	return mount(CnDetailPage, {
		propsData: {
			register: 'r',
			schema: 's',
			objectId: 'o1',
			objectStore: makeFakeStore(object),
			...extraProps,
		},
		stubs,
	})
}

describe('CnDetailPage — Primitive 2', () => {
	it('does not render related/summary/link affordances when unconfigured', () => {
		const wrapper = mountPage()
		expect(wrapper.findComponent(RelatedStub).exists()).toBe(false)
		expect(wrapper.findComponent(SummaryStub).exists()).toBe(false)
		expect(wrapper.find('[data-testid^="cn-detail-relation-link-"]').exists()).toBe(false)
	})

	it('renders CnRelatedCollections with the configured collections', () => {
		const collections = [{ title: 'Cases', register: 'r', schema: 'case', filter: { client: '@objectId' } }]
		const wrapper = mountPage({ relatedCollections: collections })
		const child = wrapper.findComponent(RelatedStub)
		expect(child.exists()).toBe(true)
		// Vue 3 hands object props to children as reactive Proxies; `toRaw`
		// keeps the assertion that the array is forwarded, not copied.
		expect(toRaw(child.props('collections'))).toBe(collections)
	})

	it('renders CnSummaryAggregates with the configured aggregates', () => {
		const aggregates = [{ label: 'Cases', register: 'r', schema: 'case', metric: 'count', filter: { client: '@objectId' } }]
		const wrapper = mountPage({ summaryAggregates: aggregates })
		const child = wrapper.findComponent(SummaryStub)
		expect(child.exists()).toBe(true)
		expect(child.props('aggregates')).toBe(aggregates)
	})

	it('renders a relation-link button and opens the modal on click', async () => {
		const wrapper = mountPage({
			relationLinks: [{ label: 'Link client', register: 'r', schema: 'client', fkField: 'client' }],
		})
		const button = wrapper.find('[data-testid="cn-detail-relation-link-0"]')
		expect(button.exists()).toBe(true)
		expect(wrapper.findComponent(RelationLinkStub).exists()).toBe(false)

		await button.trigger('click')
		const modal = wrapper.findComponent(RelationLinkStub)
		expect(modal.exists()).toBe(true)
		expect(modal.props('register')).toBe('r')
		expect(modal.props('schema')).toBe('client')
		expect(modal.props('fkField')).toBe('client')
		expect(modal.props('currentType')).toBe('r-s')
		expect(modal.props('currentObject')).toEqual({ id: 'o1', status: 'open' })
	})

	it('re-fetches the object and emits relation-linked when the modal links', async () => {
		const store = makeFakeStore({ id: 'o1', status: 'open' })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				register: 'r', schema: 's', objectId: 'o1', objectStore: store,
				relationLinks: [{ register: 'r', schema: 'client', fkField: 'client' }],
			},
			stubs,
		})
		await wrapper.find('[data-testid="cn-detail-relation-link-0"]').trigger('click')
		await Promise.resolve()
		const before = store.fetchObject.mock.calls.length
		wrapper.findComponent(RelationLinkStub).vm.$emit('linked', { id: 'o1', client: 'c-1' })
		await Promise.resolve()
		expect(store.fetchObject.mock.calls.length).toBe(before + 1)
		expect(wrapper.emitted('relation-linked')[0][0]).toEqual({ id: 'o1', client: 'c-1' })
	})
})
