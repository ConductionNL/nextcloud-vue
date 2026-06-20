/**
 * Tests for the migrated `video` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders its config (iframe vs placeholder branches), the
 * form edits the content shape and validates, and the registry entry is
 * present after importing the renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnVideoWidget from '@/components/CnVideoWidget/CnVideoWidget.vue'
import CnVideoWidgetForm from '@/components/CnVideoWidgetForm/CnVideoWidgetForm.vue'

describe('CnVideoWidget renderer', () => {
	it('renders the placeholder when no source is configured', () => {
		const wrapper = mount(CnVideoWidget, { propsData: { content: {} } })
		expect(wrapper.find('.cn-video-widget__placeholder').exists()).toBe(true)
		expect(wrapper.find('.cn-video-widget__iframe').exists()).toBe(false)
	})

	it('renders an iframe for an iframe source from config', () => {
		const wrapper = mount(CnVideoWidget, {
			propsData: {
				content: {
					sourceType: 'youtube',
					videoUrl: 'https://www.youtube.com/embed/abc123',
					aspectRatio: '4:3',
				},
			},
		})
		const iframe = wrapper.find('.cn-video-widget__iframe')
		expect(iframe.exists()).toBe(true)
		// muted defaults to true → the embed URL carries mute=1.
		expect(iframe.attributes('src')).toBe('https://www.youtube.com/embed/abc123?mute=1')
	})
})

describe('CnVideoWidgetForm', () => {
	it('emits an assembled content shape and normalises the embed URL', () => {
		const wrapper = mount(CnVideoWidgetForm)
		wrapper.vm.onUrlInput('https://www.youtube.com/watch?v=abc123')
		const events = wrapper.emitted('update:content')
		expect(events).toBeTruthy()
		const payload = events[events.length - 1][0]
		expect(payload.sourceType).toBe('youtube')
		expect(payload.videoUrl).toBe('https://www.youtube.com/embed/abc123')
		expect(payload).toHaveProperty('aspectRatio', '16:9')
		expect(payload).toHaveProperty('controls', true)
	})

	it('autoplay coerces muted=true', () => {
		const wrapper = mount(CnVideoWidgetForm)
		wrapper.vm.onAutoplayToggle(true)
		expect(wrapper.vm.assembledContent.autoplay).toBe(true)
		expect(wrapper.vm.assembledContent.muted).toBe(true)
	})

	it('validate flags an empty URL', () => {
		const wrapper = mount(CnVideoWidgetForm)
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('video registry registration', () => {
	it('registers the video type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnVideoWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('video')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({
			sourceType: null,
			videoUrl: '',
			fileId: null,
			autoplay: false,
			muted: true,
			loop: false,
			controls: true,
			aspectRatio: '16:9',
			posterUrl: '',
		})
		expect(mod.listWidgetTypes()).toContain('video')
	})
})
