/**
 * Tests for the `nc-widget` dashboard widget renderer (cn-widget-library).
 *
 * Covers the empty state when no widget is configured, the native fast-path
 * via the `OCA.Dashboard` global, and the self-registering registry entry.
 */

import { mount } from '@vue/test-utils'
import CnNcWidgetWidget from '@/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'

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
		const callback = jest.fn()
		global.window.OCA = {
			Dashboard: {
				getWidget: () => ({ title: 'Calls', callback }),
			},
		}
		const wrapper = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'pipelinq-calls' } } })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.mode).toBe('native')
		expect(callback).toHaveBeenCalled()
		expect(wrapper.text()).toContain('Calls')
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
