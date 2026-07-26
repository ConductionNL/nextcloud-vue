/**
 * Tests for CnLeafMountHost — the micro-frontend mount hand-off
 * (openregister#2127, ADR-066).
 *
 * Covers the lifecycle contract: mount on show, unmount on hide, unmount on
 * teardown, re-mount on bound-object change, and error isolation (a throwing
 * leaf mount is confined to its own container and never propagates).
 */

import { mount } from '@vue/test-utils'
import CnLeafMountHost from '../../src/components/CnLeafMountHost/CnLeafMountHost.vue'

function makeProvider() {
	return {
		id: 'hermiq',
		renderMode: 'mount',
		mount: jest.fn(),
		unmount: jest.fn(),
	}
}

describe('CnLeafMountHost', () => {
	it('calls provider.mount with the container element and props when active', () => {
		const provider = makeProvider()
		const wrapper = mount(CnLeafMountHost, {
			propsData: {
				provider,
				active: true,
				mountProps: { register: 'reg-a', schema: 'sch-b', objectId: 'obj-1', surface: 'single-entity' },
			},
		})
		expect(provider.mount).toHaveBeenCalledTimes(1)
		const [el, props] = provider.mount.mock.calls[0]
		expect(el).toBe(wrapper.find('.cn-leaf-mount-host__container').element)
		expect(props).toMatchObject({ register: 'reg-a', schema: 'sch-b', objectId: 'obj-1', surface: 'single-entity' })
		wrapper.destroy()
	})

	it('does NOT mount while inactive, then mounts when the tab becomes active', async () => {
		const provider = makeProvider()
		const wrapper = mount(CnLeafMountHost, {
			propsData: { provider, active: false, mountProps: { objectId: 'obj-1' } },
		})
		expect(provider.mount).not.toHaveBeenCalled()

		await wrapper.setProps({ active: true })
		expect(provider.mount).toHaveBeenCalledTimes(1)
		wrapper.destroy()
	})

	it('unmounts when the surface is hidden (active → false)', async () => {
		const provider = makeProvider()
		const wrapper = mount(CnLeafMountHost, {
			propsData: { provider, active: true, mountProps: { objectId: 'obj-1' } },
		})
		expect(provider.mount).toHaveBeenCalledTimes(1)

		await wrapper.setProps({ active: false })
		expect(provider.unmount).toHaveBeenCalledTimes(1)
		expect(provider.unmount.mock.calls[0][0]).toBe(wrapper.find('.cn-leaf-mount-host__container').element)
		wrapper.destroy()
	})

	it('unmounts on component teardown', () => {
		const provider = makeProvider()
		const wrapper = mount(CnLeafMountHost, {
			propsData: { provider, active: true, mountProps: { objectId: 'obj-1' } },
		})
		expect(provider.unmount).not.toHaveBeenCalled()
		wrapper.destroy()
		expect(provider.unmount).toHaveBeenCalledTimes(1)
	})

	it('re-mounts (unmount then mount) when the bound object changes', async () => {
		const provider = makeProvider()
		const wrapper = mount(CnLeafMountHost, {
			propsData: { provider, active: true, mountProps: { register: 'r', schema: 's', objectId: 'obj-1' } },
		})
		expect(provider.mount).toHaveBeenCalledTimes(1)

		await wrapper.setProps({ mountProps: { register: 'r', schema: 's', objectId: 'obj-2' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(provider.unmount).toHaveBeenCalledTimes(1)
		expect(provider.mount).toHaveBeenCalledTimes(2)
		expect(provider.mount.mock.calls[1][1].objectId).toBe('obj-2')
		wrapper.destroy()
	})

	it('does NOT re-mount when a non-identity prop changes', async () => {
		const provider = makeProvider()
		const wrapper = mount(CnLeafMountHost, {
			propsData: { provider, active: true, mountProps: { objectId: 'obj-1', extra: 1 } },
		})
		expect(provider.mount).toHaveBeenCalledTimes(1)

		await wrapper.setProps({ mountProps: { objectId: 'obj-1', extra: 2 } })
		await wrapper.vm.$nextTick()
		expect(provider.mount).toHaveBeenCalledTimes(1)
		expect(provider.unmount).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('isolates a throwing leaf mount to its own error container', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const provider = {
			id: 'broken',
			renderMode: 'mount',
			mount: jest.fn(() => { throw new Error('leaf boom') }),
			unmount: jest.fn(),
		}
		// mount() must NOT throw — the error is caught inside the host.
		const wrapper = mount(CnLeafMountHost, {
			propsData: { provider, active: true, mountProps: { objectId: 'obj-1' } },
		})
		expect(provider.mount).toHaveBeenCalledTimes(1)
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-leaf-mount-host-error"]').exists()).toBe(true)
		expect(spy).toHaveBeenCalled()
		spy.mockRestore()
		wrapper.destroy()
	})

	it('renders a custom #error slot when the leaf mount throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const provider = {
			id: 'broken',
			renderMode: 'mount',
			mount: jest.fn(() => { throw new Error('nope') }),
			unmount: jest.fn(),
		}
		const wrapper = mount(CnLeafMountHost, {
			propsData: { provider, active: true, mountProps: {} },
			scopedSlots: { error: '<div class="my-error">custom {{ props.error.message }}</div>' },
		})
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.my-error').text()).toBe('custom nope')
		spy.mockRestore()
		wrapper.destroy()
	})
})
