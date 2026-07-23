/**
 * Tests for CnHeaderWidgetForm's deferred, no-base64 upload flow: selecting a
 * file holds it locally, the actual upload happens in commit() on submit, and
 * only the returned URL (validated) is stored — mirroring CnImageWidgetForm.
 */

import { mount } from '@vue/test-utils'
import CnHeaderWidgetForm from '@/components/CnHeaderWidgetForm/CnHeaderWidgetForm.vue'

const selectFile = (wrapper, file) => {
	wrapper.vm.handleFileSelect({ target: { files: [file] } })
}

describe('CnHeaderWidgetForm upload', () => {
	it('selecting a file does NOT upload and does NOT set backgroundImageUrl', () => {
		const fileUploadFn = jest.fn()
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { fileUploadFn } })
		selectFile(wrapper, new File(['x'], 'bg.png', { type: 'image/png' }))
		expect(fileUploadFn).not.toHaveBeenCalled()
		expect(wrapper.vm.backgroundImageUrl).toBe('')
		expect(wrapper.vm.pendingFile).not.toBeNull()
	})

	it('commit() uploads the pending file and stores backgroundImageUrl', async () => {
		const fileUploadFn = jest.fn().mockResolvedValue({ url: '/apps/launchpad/resource/resource_x.png' })
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { fileUploadFn } })
		const file = new File(['x'], 'bg.png', { type: 'image/png' })
		selectFile(wrapper, file)
		await wrapper.vm.commit()
		expect(fileUploadFn).toHaveBeenCalledWith(file)
		expect(wrapper.vm.backgroundImageUrl).toBe('/apps/launchpad/resource/resource_x.png')
		expect(wrapper.vm.pendingFile).toBeNull()
	})

	it('commit() supports the deprecated uploadFn (data URL) transport and warns once', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const uploadFn = jest.fn().mockResolvedValue({ url: '/apps/launchpad/resource/legacy.png' })
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { uploadFn } })
		selectFile(wrapper, new File(['x'], 'bg.png', { type: 'image/png' }))
		await wrapper.vm.commit()
		expect(typeof uploadFn.mock.calls[0][0]).toBe('string')
		expect(uploadFn.mock.calls[0][0]).toMatch(/^data:/)
		expect(wrapper.vm.backgroundImageUrl).toBe('/apps/launchpad/resource/legacy.png')
		expect(warn).toHaveBeenCalledTimes(1)
		warn.mockRestore()
	})

	it('prefers fileUploadFn over the deprecated uploadFn when both are set', async () => {
		const fileUploadFn = jest.fn().mockResolvedValue({ url: '/apps/launchpad/resource/new.png' })
		const uploadFn = jest.fn()
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { fileUploadFn, uploadFn } })
		selectFile(wrapper, new File(['x'], 'bg.png', { type: 'image/png' }))
		await wrapper.vm.commit()
		expect(fileUploadFn).toHaveBeenCalledTimes(1)
		expect(uploadFn).not.toHaveBeenCalled()
		expect(wrapper.vm.backgroundImageUrl).toBe('/apps/launchpad/resource/new.png')
	})

	it('commit() is a no-op with no pending file (keeps the existing URL)', async () => {
		const fileUploadFn = jest.fn()
		const wrapper = mount(CnHeaderWidgetForm, {
			propsData: {
				fileUploadFn,
				editingWidget: { content: { title: 'Hi', backgroundImageUrl: 'https://x.test/keep.png' } },
			},
		})
		await wrapper.vm.commit()
		expect(fileUploadFn).not.toHaveBeenCalled()
		expect(wrapper.vm.backgroundImageUrl).toBe('https://x.test/keep.png')
	})

	it('commit() rejects a hostile scheme returned by the transport', async () => {
		const fileUploadFn = jest.fn().mockResolvedValue({ url: 'javascript:alert(1)' })
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { fileUploadFn } })
		selectFile(wrapper, new File(['x'], 'bg.png', { type: 'image/png' }))
		await expect(wrapper.vm.commit()).rejects.toThrow()
		expect(wrapper.vm.backgroundImageUrl).toBe('')
	})

	it.each([
		['null', null],
		['empty object', {}],
		['empty url', { url: '' }],
	])('commit() rejects a malformed transport response (%s)', async (_label, response) => {
		const fileUploadFn = jest.fn().mockResolvedValue(response)
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { fileUploadFn } })
		selectFile(wrapper, new File(['x'], 'bg.png', { type: 'image/png' }))
		await expect(wrapper.vm.commit()).rejects.toThrow(/no URL/i)
		expect(wrapper.vm.backgroundImageUrl).toBe('')
	})

	it('fallback (no transport) embeds a small file as a data URL on commit', async () => {
		const wrapper = mount(CnHeaderWidgetForm)
		selectFile(wrapper, new File(['abcdefghij'], 'bg.png', { type: 'image/png' }))
		await wrapper.vm.commit()
		expect(wrapper.vm.backgroundImageUrl).toMatch(/^data:image\//)
		expect(wrapper.vm.pendingFile).toBeNull()
	})

	it('fallback (no transport) refuses a file larger than the 1 MB cap', async () => {
		const wrapper = mount(CnHeaderWidgetForm)
		const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
		selectFile(wrapper, big)
		await expect(wrapper.vm.commit()).rejects.toThrow()
		expect(wrapper.vm.backgroundImageUrl).toBe('')
	})

	it('shows a Remove button while a file is pending and clears it on remove', async () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { fileUploadFn: jest.fn() } })
		const removeButtons = () => wrapper.findAllComponents({ name: 'NcButton' })

		expect(wrapper.vm.pendingFile).toBeNull()
		expect(removeButtons().length).toBe(0)

		selectFile(wrapper, new File(['x'], 'bg.png', { type: 'image/png' }))
		await wrapper.vm.$nextTick()
		expect(removeButtons().length).toBe(1)

		wrapper.vm.clearPendingFile()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.pendingFile).toBeNull()
		expect(removeButtons().length).toBe(0)
	})

	it('validate requires a title', () => {
		const wrapper = mount(CnHeaderWidgetForm)
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
		wrapper.vm.updateField('title', 'Welcome')
		expect(wrapper.vm.validate()).toEqual([])
	})
})
