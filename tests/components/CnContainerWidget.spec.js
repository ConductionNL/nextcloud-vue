/**
 * Tests for the migrated `container` dashboard widget (cn-widget-library
 * Wave 1).
 *
 * Covers: renderer renders its config and recursively dispatches child
 * placements through the shared registry (rendering any handed depth, no cap),
 * the form edits the content shape and always validates, and the registry
 * entry is present after importing the renderer index.
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnContainerWidget from '@/components/CnContainerWidget/CnContainerWidget.vue'
import CnContainerWidgetForm from '@/components/CnContainerWidgetForm/CnContainerWidgetForm.vue'
// Importing the video index self-registers the `video` type into the SAME
// (non-isolated) shared registry singleton that CnContainerChild consults, so
// the recursive-dispatch test can resolve a child renderer.
import '@/components/CnVideoWidget/index.js'

describe('CnContainerWidget renderer', () => {
	it('renders the title and wrapper from config', async () => {
		const wrapper = mount(CnContainerWidget, {
			propsData: { content: { title: 'My Container', padding: 'large', placements: [] } },
		})
		await nextTick()
		expect(wrapper.find('.cn-container-widget__title').text()).toBe('My Container')
		expect(wrapper.vm.paddingPx).toBe('16px')
	})

	it('recursively dispatches child placements via the registry', async () => {
		// `video` is registered at module load (top-of-file import) into the
		// shared singleton CnContainerChild consults.
		const wrapper = mount(CnContainerWidget, {
			propsData: {
				content: {
					placements: [
						{ id: 1, type: 'video', content: { sourceType: 'youtube', videoUrl: 'https://www.youtube.com/embed/x' } },
					],
				},
			},
		})
		await nextTick()
		expect(wrapper.findAll('.cn-container-widget__child').length).toBe(1)
		expect(wrapper.findComponent({ name: 'CnVideoWidget' }).exists()).toBe(true)
	})
})

describe('CnContainerWidgetForm', () => {
	it('emits the assembled container content shape', () => {
		const wrapper = mount(CnContainerWidgetForm)
		wrapper.vm.updateField('title', 'Box')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload).toMatchObject({
			title: 'Box',
			backgroundColor: 'transparent',
			padding: 'medium',
		})
		expect(Array.isArray(payload.placements)).toBe(true)
	})

	it('validate always passes (every field optional)', () => {
		const wrapper = mount(CnContainerWidgetForm)
		expect(wrapper.vm.validate()).toEqual([])
	})
})

describe('container registry registration', () => {
	it('registers the container type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnContainerWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('container')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({
			placements: [],
			backgroundColor: 'transparent',
			padding: 'medium',
			title: '',
		})
		expect(mod.listWidgetTypes()).toContain('container')
	})
})
