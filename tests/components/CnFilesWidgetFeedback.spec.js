/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFilesWidget tells the user what happened: per-file upload progress and
 * per-file upload errors, why a delete was refused, and no thumbnails in tree
 * mode (launchpad files-widget::upload-progress-indication, files-widget
 * refusal on a folder turned read-only, files-widget::config-for-thumbnails).
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path, params = {}) => {
		let out = path
		for (const [key, value] of Object.entries(params)) {
			out = out.replace(`{${key}}`, encodeURIComponent(value))
		}
		return `/index.php${out}`
	},
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnFilesWidget = require('../../src/components/CnFilesWidget/CnFilesWidget.vue').default

/**
 * Drain the widget's lazy axios import and one render.
 *
 * @param {object} wrapper The wrapper.
 * @return {Promise<void>}
 */
async function flush(wrapper) {
	for (let i = 0; i < 4; i++) {
		await Promise.resolve()
	}
	await wrapper.vm.$nextTick()
}

/**
 * A dashboard-mode widget on a writable folder.
 *
 * @param {object} content The placement content.
 * @return {Promise<object>} The wrapper.
 */
async function mountWidget(content = {}) {
	const wrapper = mount(CnFilesWidget, { propsData: { placement: { id: 5 }, content: { allowUpload: true, allowDelete: true, ...content } } })
	await flush(wrapper)
	return wrapper
}

const file = (name, size) => new File(['x'.repeat(size)], name)

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	axios.delete.mockReset()
	axios.get.mockResolvedValue({ data: { items: [{ fileId: 1, name: 'pic.png', isFolder: false, canEdit: true, canDelete: true, thumbnailUrl: 'https://nc/preview/1' }] } })
})

describe('CnFilesWidget upload feedback', () => {
	it('shows each file queued, uploading or sent as the bytes go out', async () => {
		let progress
		let finish
		axios.post.mockImplementation((url, body, config) => {
			progress = config.onUploadProgress
			return new Promise((resolve) => {
				finish = resolve
			})
		})
		const wrapper = await mountWidget()

		const pending = wrapper.vm.uploadFiles([file('a.txt', 100), file('b.txt', 100), file('c.txt', 100)])
		await flush(wrapper)
		progress({ loaded: 150, total: 300 })
		await wrapper.vm.$nextTick()

		const items = wrapper.findAll('.cn-files-widget__progress-item')
		expect(items.map((item) => item.find('.cn-files-widget__upload-name').text())).toEqual(['a.txt', 'b.txt', 'c.txt'])
		expect(items.map((item) => item.find('[role="progressbar"]').attributes('aria-valuenow'))).toEqual(['100', '50', '0'])
		expect(items.map((item) => item.find('.cn-files-widget__upload-status').text())).toEqual(['Sent', 'Uploading 50%', 'Queued'])
		expect(wrapper.find('.cn-files-widget__uploads-total').text()).toContain('Uploading 150 B / 300 B')

		finish({ data: { uploaded: [], errors: [] } })
		await pending
		await flush(wrapper)
		expect(wrapper.findAll('.cn-files-widget__upload-status').map((s) => s.text())).toEqual(['Uploaded', 'Uploaded', 'Uploaded'])
		expect(wrapper.find('.cn-files-widget__uploads-total').text()).toContain('Upload complete')

		await wrapper.find('.cn-files-widget__notice-dismiss').trigger('click')
		expect(wrapper.find('.cn-files-widget__uploads').exists()).toBe(false)
	})

	it('names each file the host refused, with its reason, and keeps the others uploaded', async () => {
		axios.post.mockResolvedValue({ data: { uploaded: [{ name: 'ok.txt' }], errors: [{ name: 'big.bin', error: 'insufficient_storage' }] } })
		const wrapper = await mountWidget()

		await wrapper.vm.uploadFiles([file('ok.txt', 1), file('big.bin', 2)])
		await flush(wrapper)

		const items = wrapper.findAll('.cn-files-widget__progress-item')
		expect(items[0].find('.cn-files-widget__upload-status').text()).toBe('Uploaded')
		expect(items[1].classes()).toContain('cn-files-widget__progress-item--failed')
		expect(items[1].find('.cn-files-widget__upload-status').text()).toBe('Not enough storage space')
		expect(wrapper.find('.cn-files-widget__uploads-total').text()).toContain('1 file could not be uploaded')
	})

	it('marks every file failed when the whole request fails', async () => {
		axios.post.mockRejectedValue({ response: { status: 403, data: { error: 'no_access' } } })
		const wrapper = await mountWidget()

		await wrapper.vm.uploadFiles([file('a.txt', 1), file('b.txt', 1)])
		await flush(wrapper)

		expect(wrapper.findAll('.cn-files-widget__upload-status').map((s) => s.text()))
			.toEqual(['You may not upload to this folder', 'You may not upload to this folder'])
	})
})

describe('CnFilesWidget delete refusal', () => {
	it('says the permission is gone when the delete is refused with 403, and keeps the row', async () => {
		axios.delete.mockRejectedValue({ response: { status: 403 } })
		const wrapper = await mountWidget()

		wrapper.vm.confirmDelete({ fileId: 1, name: 'pic.png' })
		await wrapper.vm.performDelete()
		await flush(wrapper)

		const notice = wrapper.find('.cn-files-widget__notice')
		expect(notice.attributes('role')).toBe('alert')
		expect(notice.text()).toContain('You no longer have permission to delete pic.png.')
		expect(wrapper.findAll('.cn-files-widget__row-label').map((l) => l.text())).toEqual(['pic.png'])

		await notice.find('button').trigger('click')
		expect(wrapper.find('.cn-files-widget__notice').exists()).toBe(false)
	})

	it('says the delete failed for any other error', async () => {
		axios.delete.mockRejectedValue({ response: { status: 500 } })
		const wrapper = await mountWidget()

		wrapper.vm.confirmDelete({ fileId: 1, name: 'pic.png' })
		await wrapper.vm.performDelete()
		await flush(wrapper)

		expect(wrapper.find('.cn-files-widget__notice').text()).toContain('Could not delete pic.png.')
	})
})

describe('CnFilesWidget tree mode', () => {
	it('draws no thumbnails in tree mode, even with showThumbnails on', async () => {
		const wrapper = await mountWidget({ viewMode: 'tree', showThumbnails: true })
		expect(wrapper.find('.cn-files-widget__row-thumb').exists()).toBe(false)
		expect(wrapper.find('.cn-files-widget__row-icon').text()).toBe('📄')
	})

	it('still draws them in list mode', async () => {
		const wrapper = await mountWidget({ viewMode: 'list' })
		expect(wrapper.find('.cn-files-widget__row-thumb').exists()).toBe(true)
	})
})
