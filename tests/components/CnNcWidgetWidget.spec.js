/**
 * Tests for the `nc-widget` dashboard widget renderer (cn-widget-library).
 *
 * Covers the empty state when no widget is configured, the native fast-path
 * via the `OCA.Dashboard` global, and the self-registering registry entry.
 */

import { mount, flushPromises } from '@vue/test-utils'
import axios from '@nextcloud/axios'
import CnNcWidgetWidget from '@/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ status: 200, data: {} })) },
}))

describe('CnNcWidgetWidget renderer', () => {
	afterEach(() => {
		if (global.window) {
			delete global.window.OCA
		}
	})

	it('shows the empty state when no widgetId is configured', () => {
		const wrapper = mount(CnNcWidgetWidget, { propsData: { content: {} } })
		const state = wrapper.find('.cn-nc-widget-widget__state')
		expect(state.exists()).toBe(true)
		expect(state.text()).toContain('No widget selected')
	})

	it('mounts natively when OCA.Dashboard exposes a callback', async () => {
		const meta = { title: 'Calls' }
		const callback = jest.fn()
		meta.callback = callback
		global.window.OCA = {
			Dashboard: {
				getWidget: () => meta,
			},
		}
		const wrapper = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'pipelinq-calls' } } })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.mode).toBe('native')
		expect(callback).toHaveBeenCalled()
		// Nextcloud's OCA.Dashboard callback signature is `(el, { widget })`:
		// the DOM element first, then the metadata wrapped in a `{ widget }`
		// envelope (NOT passed bare) so consumers can destructure `{ widget }`
		// and read e.g. `widget.title`, or real widgets throw on `widget.title`.
		const [el, ctx] = callback.mock.calls[0]
		expect(el).toBeInstanceOf(global.window.HTMLElement)
		expect(ctx).toEqual({ widget: meta })
		expect(wrapper.text()).toContain('Calls')
	})

	it('falls back to the API list when an async native callback rejects', async () => {
		const callback = jest.fn(() => Promise.reject(new Error('boom')))
		global.window.OCA = {
			Dashboard: {
				getWidget: () => ({ title: 'Calls', callback }),
			},
		}
		// The API must actually return an item. `loadApiItems()` re-enters the
		// native path when the list comes back EMPTY (a widget with no
		// IAPIWidgetV2 provider must not render a false "no items" state), so
		// with the default empty payload the settled mode is `native` again and
		// this spec would be asserting a transient state.
		axios.get.mockResolvedValueOnce({
			status: 200,
			data: { ocs: { data: { 'pipelinq-calls': { items: [{ id: 'i1', title: 'Missed call' }] } } } },
		})
		const wrapper = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'pipelinq-calls' } } })
		// Vue 3's `nextTick()` only awaits the scheduler flush — it no longer
		// implies every pending microtask (the callback's rejection handler, then
		// the awaited axios GET inside the fallback) has run. Under Vue 2 the
		// nextTick + Promise.resolve chain happened to cover them; here it lands
		// mid-fallback and reads a stale `native`. flushPromises drains them all.
		await flushPromises()
		expect(wrapper.vm.mode).toBe('api')
		expect(axios.get).toHaveBeenCalled()
	})
})

describe('nc-widget registry registration', () => {
	it('registers the nc-widget type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnNcWidgetWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('nc-widget')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({ widgetId: '', displayMode: 'vertical' })
	})
})
