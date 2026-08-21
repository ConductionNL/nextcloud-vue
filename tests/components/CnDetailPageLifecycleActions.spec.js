/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage's `lifecycleActions` wiring — the page mounts
 * CnLifecycleActions in the header when the manifest declares the config,
 * forwards the object id + loaded object, and re-fetches the object on a
 * transition's `reload` event.
 */

import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const LifecycleStub = {
	name: 'CnLifecycleActions',
	props: ['objectId', 'object', 'config', 'schema'],
	template: '<div class="lifecycle-stub" data-testid="lifecycle-stub" />',
}

function makeFakeStore(object, schema = null) {
	return {
		objects: object ? { 'r-s': { o1: object } } : {},
		schemas: schema ? { 'r-s': schema } : {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

describe('CnDetailPage — lifecycleActions', () => {
	it('does not mount CnLifecycleActions when the prop is unset', () => {
		const wrapper = mount(CnDetailPage, {
			propsData: { register: 'r', schema: 's', objectId: 'o1', objectStore: makeFakeStore() },
			stubs: { CnLifecycleActions: LifecycleStub },
		})
		expect(wrapper.find('[data-testid="lifecycle-stub"]').exists()).toBe(false)
	})

	it('mounts CnLifecycleActions with the object id + config when declared', () => {
		const wrapper = mount(CnDetailPage, {
			propsData: {
				register: 'r',
				schema: 's',
				objectId: 'o1',
				objectStore: makeFakeStore({ id: 'o1', status: 'open' }),
				lifecycleActions: { field: 'status' },
			},
			stubs: { CnLifecycleActions: LifecycleStub },
		})
		const child = wrapper.findComponent(LifecycleStub)
		expect(child.exists()).toBe(true)
		expect(child.props('objectId')).toBe('o1')
		expect(child.props('config')).toEqual({ field: 'status' })
		expect(child.props('object')).toEqual({ id: 'o1', status: 'open' })
	})

	it('forwards the fetched schema so transition inputs resolve their fields', () => {
		const schema = { properties: { reason: { type: 'string', title: 'Reason' } } }
		const wrapper = mount(CnDetailPage, {
			propsData: {
				register: 'r',
				schema: 's',
				objectId: 'o1',
				objectStore: makeFakeStore({ id: 'o1', status: 'open' }, schema),
				lifecycleActions: { field: 'status' },
			},
			stubs: { CnLifecycleActions: LifecycleStub },
		})
		expect(wrapper.findComponent(LifecycleStub).props('schema')).toEqual(schema)
	})

	it('re-fetches the object when CnLifecycleActions emits reload', async () => {
		const store = makeFakeStore({ id: 'o1', status: 'open' })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				register: 'r',
				schema: 's',
				objectId: 'o1',
				objectStore: store,
				lifecycleActions: { field: 'status' },
			},
			stubs: { CnLifecycleActions: LifecycleStub },
		})
		await Promise.resolve()
		const callsBefore = store.fetchObject.mock.calls.length
		wrapper.findComponent(LifecycleStub).vm.$emit('reload')
		await Promise.resolve()
		expect(store.fetchObject.mock.calls.length).toBe(callsBefore + 1)
		expect(store.fetchObject).toHaveBeenLastCalledWith('r-s', 'o1')
	})

	it('re-emits transitioned to the host', () => {
		const wrapper = mount(CnDetailPage, {
			propsData: {
				register: 'r',
				schema: 's',
				objectId: 'o1',
				objectStore: makeFakeStore({ id: 'o1', status: 'open' }),
				lifecycleActions: { field: 'status' },
			},
			stubs: { CnLifecycleActions: LifecycleStub },
		})
		const payload = { action: 'close', to: 'closed', object: { id: 'o1', status: 'closed' } }
		wrapper.findComponent(LifecycleStub).vm.$emit('transitioned', payload)
		expect(wrapper.emitted('transitioned')[0][0]).toEqual(payload)
	})
})
