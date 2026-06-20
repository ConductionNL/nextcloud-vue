/**
 * Tests for the `image` dashboard widget form + registration completion
 * (cn-widget-library Wave 1). The renderer already existed; this covers the
 * new form, the renderer rendering its config, and the now-present registry
 * entry after importing the renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnImageWidget from '@/components/CnImageWidget/CnImageWidget.vue'
import CnImageWidgetForm from '@/components/CnImageWidgetForm/CnImageWidgetForm.vue'

describe('CnImageWidget renderer', () => {
	it('renders the placeholder when no URL is set', () => {
		const wrapper = mount(CnImageWidget, { propsData: { content: {} } })
		expect(wrapper.find('.cn-image-widget__placeholder').exists()).toBe(true)
	})

	it('renders an img when a URL is set', () => {
		const wrapper = mount(CnImageWidget, { propsData: { content: { url: 'https://x.test/a.png' } } })
		expect(wrapper.find('.cn-image-widget__img').exists()).toBe(true)
	})
})

describe('CnImageWidgetForm', () => {
	it('emits the assembled shape on a URL edit', () => {
		const wrapper = mount(CnImageWidgetForm)
		wrapper.vm.updateField('url', 'https://x.test/a.png')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload).toMatchObject({ url: 'https://x.test/a.png', fit: 'cover' })
	})

	it('validate rejects an empty URL', () => {
		const wrapper = mount(CnImageWidgetForm)
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('image registry registration', () => {
	it('registers the image type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnImageWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('image')
		expect(entry).not.toBeNull()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent.fit).toBe('cover')
	})
})
