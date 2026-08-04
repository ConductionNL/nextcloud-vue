/**
 * Tests for CnFilesWidget's dual mode:
 *  - Object-bound mode (objectId + register + schema present, as merged by
 *    CnWidgetGrid on a detail page): lists/uploads/deletes against the
 *    OpenRegister object-folder endpoints
 *    (`/apps/openregister/api/objects/{register}/{schema}/{id}/...`).
 *  - Dashboard mode (placement, no object props): the legacy
 *    `/api/widgets/files/{placementId}/...` contract stays unchanged.
 */

jest.mock('@nextcloud/router', () => ({
	// Substitute `{param}` placeholders from the second arg so tests can assert
	// the fully-resolved URL, then prefix index.php like the real helper.
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
const CnFilesWidgetDeleteDialog = require('../../src/dialogs/CnFilesWidgetDeleteDialog.vue').default

/**
 * Resolve pending microtasks + a Vue render tick (the widget lazily
 * `await import('@nextcloud/axios')`, so we need to drain the microtask queue).
 *
 * @param {object} wrapper The Vue Test Utils wrapper to flush.
 * @return {Promise<void>}
 */
async function flush(wrapper) {
	await Promise.resolve()
	await Promise.resolve()
	await wrapper.vm.$nextTick()
}

const OBJECT_PROPS = {
	objectId: 'pet-123',
	register: 'petstore',
	schema: 'pet',
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	axios.delete.mockReset()
	axios.get.mockResolvedValue({ data: { results: [] } })
	axios.post.mockResolvedValue({ data: {} })
	axios.delete.mockResolvedValue({ data: {} })
})

describe('CnFilesWidget — object-bound mode', () => {
	it('lists the bound object\'s files via the OpenRegister files endpoint', async () => {
		axios.get.mockResolvedValue({
			data: { results: [{ id: 11, name: 'a.pdf', size: 100 }] },
		})
		const wrapper = mount(CnFilesWidget, { propsData: { ...OBJECT_PROPS } })
		await flush(wrapper)

		expect(wrapper.vm.objectBound).toBe(true)
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe(
			'/index.php/apps/openregister/api/objects/petstore/pet/pet-123/files',
		)
		expect(wrapper.vm.items).toEqual([
			expect.objectContaining({ name: 'a.pdf', fileId: 11, isFolder: false, size: 100 }),
		])
	})

	it('derives the schema slug from a schema object', async () => {
		const wrapper = mount(CnFilesWidget, {
			propsData: { ...OBJECT_PROPS, schema: { slug: 'pet', id: 7 } },
		})
		await flush(wrapper)

		expect(wrapper.vm.schemaSlug).toBe('pet')
		expect(axios.get.mock.calls[0][0]).toBe(
			'/index.php/apps/openregister/api/objects/petstore/pet/pet-123/files',
		)
	})

	it('uploads via filesMultipart with a files[] body', async () => {
		const wrapper = mount(CnFilesWidget, { propsData: { ...OBJECT_PROPS } })
		await flush(wrapper)

		const file = new File(['x'], 'photo.png', { type: 'image/png' })
		await wrapper.vm.onFileInputChange({ target: { files: [file] } })
		await flush(wrapper)

		expect(axios.post).toHaveBeenCalledTimes(1)
		const [url, body] = axios.post.mock.calls[0]
		expect(url).toBe(
			'/index.php/apps/openregister/api/objects/petstore/pet/pet-123/filesMultipart',
		)
		expect(body).toBeInstanceOf(FormData)
		expect(body.getAll('files[]')).toHaveLength(1)
	})

	it('deletes via the object files endpoint', async () => {
		const wrapper = mount(CnFilesWidget, { propsData: { ...OBJECT_PROPS } })
		await flush(wrapper)

		wrapper.vm.confirmDelete({ fileId: 11, name: 'a.pdf' })
		await wrapper.vm.performDelete()
		await flush(wrapper)

		expect(axios.delete).toHaveBeenCalledTimes(1)
		expect(axios.delete.mock.calls[0][0]).toBe(
			'/index.php/apps/openregister/api/objects/petstore/pet/pet-123/files/11',
		)
	})

	it('opens the extracted delete dialog on confirmDelete and clears the target on close', async () => {
		const wrapper = mount(CnFilesWidget, { propsData: { ...OBJECT_PROPS } })
		await flush(wrapper)

		const dialog = wrapper.findComponent(CnFilesWidgetDeleteDialog)
		expect(dialog.props('open')).toBe(false)

		wrapper.vm.confirmDelete({ fileId: 11, name: 'a.pdf' })
		await wrapper.vm.$nextTick()
		expect(dialog.props('open')).toBe(true)
		expect(dialog.props('fileName')).toBe('a.pdf')

		// Closing (Cancel / Esc / click-outside) clears the pending target.
		dialog.vm.$emit('update:open', false)
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.confirmTarget).toBeNull()
		expect(dialog.props('open')).toBe(false)
	})
})

describe('CnFilesWidget — viewMode', () => {
	it('applies the grid modifier class when content.viewMode is "grid"', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 1, name: 'a.pdf', size: 5 }] } })
		const wrapper = mount(CnFilesWidget, {
			propsData: { ...OBJECT_PROPS, content: { viewMode: 'grid' } },
		})
		await flush(wrapper)

		expect(wrapper.vm.viewMode).toBe('grid')
		expect(wrapper.find('.cn-files-widget__list').classes()).toContain('cn-files-widget__list--grid')
	})

	it('defaults to list layout (no grid class) when viewMode is unset or "list"', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 1, name: 'a.pdf', size: 5 }] } })
		const wrapper = mount(CnFilesWidget, {
			propsData: { ...OBJECT_PROPS, content: { viewMode: 'list' } },
		})
		await flush(wrapper)

		expect(wrapper.vm.viewMode).toBe('list')
		expect(wrapper.find('.cn-files-widget__list').classes()).not.toContain('cn-files-widget__list--grid')
	})
})

describe('CnFilesWidget — dashboard mode (regression)', () => {
	it('lists via the legacy widgets endpoint when a placement is bound', async () => {
		axios.get.mockResolvedValue({ data: { items: [] } })
		const wrapper = mount(CnFilesWidget, { propsData: { placement: { id: 5 } } })
		await flush(wrapper)

		expect(wrapper.vm.objectBound).toBe(false)
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe(
			'/index.php/apps/files/api/widgets/files/5/contents',
		)
	})

	it('does not fetch when no placement and no object context', async () => {
		const wrapper = mount(CnFilesWidget, { propsData: {} })
		await flush(wrapper)

		expect(wrapper.vm.objectBound).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
	})
})

describe('CnFilesWidget — thumbnails', () => {
	it('renders the backend thumbnailUrl as an <img> in dashboard mode', async () => {
		axios.get.mockResolvedValue({ data: { items: [
			{ fileId: 1, name: 'pic.png', isFolder: false, thumbnailUrl: 'https://nc/preview/1' },
		] } })
		const wrapper = mount(CnFilesWidget, { propsData: { placement: { id: 5 } } })
		await flush(wrapper)

		const img = wrapper.find('.cn-files-widget__row-thumb')
		expect(img.exists()).toBe(true)
		expect(img.attributes('src')).toBe('https://nc/preview/1')
	})

	it('falls back to the icon when showThumbnails is false', async () => {
		axios.get.mockResolvedValue({ data: { items: [
			{ fileId: 1, name: 'pic.png', isFolder: false, thumbnailUrl: 'https://nc/preview/1' },
		] } })
		const wrapper = mount(CnFilesWidget, {
			propsData: { placement: { id: 5 }, content: { showThumbnails: false } },
		})
		await flush(wrapper)

		expect(wrapper.find('.cn-files-widget__row-thumb').exists()).toBe(false)
		expect(wrapper.find('.cn-files-widget__row-icon').text()).toBe('📄')
	})

	it('falls back to the icon after the thumbnail <img> errors', async () => {
		axios.get.mockResolvedValue({ data: { items: [
			{ fileId: 1, name: 'pic.png', isFolder: false, thumbnailUrl: 'https://nc/preview/1' },
		] } })
		const wrapper = mount(CnFilesWidget, { propsData: { placement: { id: 5 } } })
		await flush(wrapper)

		await wrapper.find('.cn-files-widget__row-thumb').trigger('error')
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-files-widget__row-thumb').exists()).toBe(false)
		expect(wrapper.find('.cn-files-widget__row-icon').text()).toBe('📄')
	})

	it('builds an image preview URL for object-bound files', async () => {
		axios.get.mockResolvedValue({ data: { results: [
			{ id: 9, name: 'photo.jpg', size: 10, mimeType: 'image/jpeg' },
		] } })
		const wrapper = mount(CnFilesWidget, { propsData: { ...OBJECT_PROPS } })
		await flush(wrapper)

		const img = wrapper.find('.cn-files-widget__row-thumb')
		expect(img.exists()).toBe(true)
		expect(img.attributes('src')).toBe('/index.php/core/preview?fileId=9&x=256&y=256&a=1')
	})

	it('renders no thumbnail for a non-image object-bound file', async () => {
		axios.get.mockResolvedValue({ data: { results: [
			{ id: 9, name: 'notes.txt', size: 10, mimeType: 'text/plain' },
		] } })
		const wrapper = mount(CnFilesWidget, { propsData: { ...OBJECT_PROPS } })
		await flush(wrapper)

		expect(wrapper.find('.cn-files-widget__row-thumb').exists()).toBe(false)
	})
})
