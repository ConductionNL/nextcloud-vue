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
	beforeEach(() => {
		window.URL.createObjectURL = jest.fn(() => 'blob:mock-preview')
		window.URL.revokeObjectURL = jest.fn()
	})
	afterEach(() => {
		delete window.URL.createObjectURL
		delete window.URL.revokeObjectURL
	})

	const selectFile = (wrapper, file) => {
		// Bypass the read-only files property of the native input by calling the
		// handler directly with a synthetic event.
		wrapper.vm.handleFileSelect({ target: { files: [file] } })
	}

	it('emits the assembled shape on a URL edit', () => {
		const wrapper = mount(CnImageWidgetForm)
		wrapper.vm.updateField('url', 'https://x.test/a.png')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload).toMatchObject({ url: 'https://x.test/a.png', fit: 'cover' })
	})

	it('validate rejects an empty URL with no pending file', () => {
		const wrapper = mount(CnImageWidgetForm)
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})

	it('selecting a file does NOT upload and does NOT set the URL', () => {
		const uploadFn = jest.fn()
		const wrapper = mount(CnImageWidgetForm, { propsData: { uploadFn } })
		selectFile(wrapper, new File(['x'], 'a.png', { type: 'image/png' }))
		expect(uploadFn).not.toHaveBeenCalled()
		expect(wrapper.vm.url).toBe('')
		expect(wrapper.vm.pendingFile).not.toBeNull()
		expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1)
	})

	it('validate passes once a file is pending', () => {
		const wrapper = mount(CnImageWidgetForm, { propsData: { uploadFn: jest.fn() } })
		selectFile(wrapper, new File(['x'], 'a.png', { type: 'image/png' }))
		expect(wrapper.vm.validate()).toEqual([])
	})

	it('commit() uploads the pending file via the transport and stores the URL', async () => {
		const uploadFn = jest.fn().mockResolvedValue({ url: '/apps/launchpad/resource/resource_x.png' })
		const wrapper = mount(CnImageWidgetForm, { propsData: { uploadFn } })
		const file = new File(['x'], 'a.png', { type: 'image/png' })
		selectFile(wrapper, file)
		await wrapper.vm.commit()
		expect(uploadFn).toHaveBeenCalledWith(file)
		expect(wrapper.vm.url).toBe('/apps/launchpad/resource/resource_x.png')
		expect(wrapper.vm.pendingFile).toBeNull()
	})

	it('commit() is a no-op with no pending file (edit mode keeps the URL)', async () => {
		const uploadFn = jest.fn()
		const wrapper = mount(CnImageWidgetForm, {
			propsData: { uploadFn, editingWidget: { content: { url: 'https://x.test/keep.png' } } },
		})
		await wrapper.vm.commit()
		expect(uploadFn).not.toHaveBeenCalled()
		expect(wrapper.vm.url).toBe('https://x.test/keep.png')
	})

	it('commit() rethrows and surfaces an error when the transport fails', async () => {
		const uploadFn = jest.fn().mockRejectedValue(new Error('boom'))
		const wrapper = mount(CnImageWidgetForm, { propsData: { uploadFn } })
		selectFile(wrapper, new File(['x'], 'a.png', { type: 'image/png' }))
		await expect(wrapper.vm.commit()).rejects.toThrow('boom')
		expect(wrapper.vm.uploadError).toBe('boom')
		expect(wrapper.vm.url).toBe('')
	})

	it('typing a URL discards a pending file (escape hatch)', () => {
		const wrapper = mount(CnImageWidgetForm, { propsData: { uploadFn: jest.fn() } })
		selectFile(wrapper, new File(['x'], 'a.png', { type: 'image/png' }))
		expect(wrapper.vm.pendingFile).not.toBeNull()
		wrapper.vm.updateField('url', 'https://x.test/b.png')
		expect(wrapper.vm.pendingFile).toBeNull()
		expect(wrapper.vm.url).toBe('https://x.test/b.png')
		expect(window.URL.revokeObjectURL).toHaveBeenCalled()
	})

	it('fallback (no transport) refuses a file larger than the 1 MB cap', async () => {
		const wrapper = mount(CnImageWidgetForm)
		const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
		selectFile(wrapper, big)
		await expect(wrapper.vm.commit()).rejects.toThrow()
		expect(wrapper.vm.url).toBe('')
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
