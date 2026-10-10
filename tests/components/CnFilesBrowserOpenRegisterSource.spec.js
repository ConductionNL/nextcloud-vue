/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files browser on an OpenRegister object's folder, read through
 * OpenRegister's files API instead of WebDAV: a reader browses without a
 * share, a person who may not change the folder is offered nothing that
 * changes it, and the files tab uses this source by default.
 *
 * @spec openspec/changes/files-browser-openregister-source/specs/files-browser/spec.md
 */
const { flushPromises, mount } = require('@vue/test-utils')

const mockCalls = []
let mockAnswers = {}

jest.mock('@nextcloud/axios', () => {
	const respond = (method, url, body, options) => {
		mockCalls.push({ method, url, body, options })
		const key = Object.keys(mockAnswers).find((k) => `${method} ${url}`.includes(k))
		const answer = key ? mockAnswers[key] : { status: 200, data: {} }
		const value = typeof answer === 'function' ? answer({ url, body, options }) : answer
		if (value.status >= 400) {
			const error = new Error(`Request failed with status code ${value.status}`)
			error.response = value
			return Promise.reject(error)
		}
		return Promise.resolve(value)
	}
	return {
		__esModule: true,
		default: {
			get: (url, options) => respond('GET', url, null, options),
			post: (url, body, options) => respond('POST', url, body, options),
			put: (url, body, options) => respond('PUT', url, body, options),
			delete: (url, options) => respond('DELETE', url, null, options),
		},
	}
})

jest.mock('vue-material-design-icons/Delete.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/FileOutline.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/OpenInNew.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/Upload.vue', () => ({ template: '<span/>' }), { virtual: true })

const CnFilesBrowser = require('../../src/components/CnFilesBrowser/CnFilesBrowser.vue').default
const CnFilesTab = require('../../src/components/CnObjectSidebar/CnFilesTab.vue').default
const { createOpenRegisterSource, entryToNode, toApiPath } = require('../../src/components/CnFilesBrowser/openRegisterSource.js')

const OBJECT = '6c3a711f-c480-467b-a25f-d6a9c888384d'
const FOLDER = `/objects/20/35/${OBJECT}/folder`

const ROOT_ENTRIES = [
	{ id: 101, name: 'besluit.pdf', type: 'file', mimetype: 'application/pdf', size: 2048, mtime: 1760000000, path: 'besluit.pdf' },
	{ id: 200, name: 'Bijlagen', type: 'folder', mimetype: 'httpd/unix-directory', size: 6, mtime: 1760000001, path: 'Bijlagen' },
]
const SUB_ENTRIES = [
	{ id: 201, name: 'brief.txt', type: 'file', mimetype: 'text/plain', size: 6, mtime: 1760000002, path: 'Bijlagen/brief.txt' },
]

/**
 * Answer folder listings like the server: root and `Bijlagen`.
 *
 * @param {boolean} canChange What the listing says.
 * @return {Function} The answer.
 */
function listingAnswer(canChange) {
	return ({ options }) => {
		const path = options?.params?.path ?? ''
		if (path === 'Bijlagen') {
			return { status: 200, data: { path: 'Bijlagen', folderId: 200, canChange, entries: SUB_ENTRIES } }
		}
		return { status: 200, data: { path: '', folderId: 100, canChange, entries: ROOT_ENTRIES } }
	}
}

function source() {
	return createOpenRegisterSource({ register: '20', schema: '35', objectId: OBJECT })
}

function mountBrowser() {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/', rootLabel: 'Termijn eindigt vandaag', source: source(), uploadButton: true, dropHint: true },
		global: { stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' } } },
	})
}

describe('the OpenRegister source', () => {
	beforeEach(() => {
		mockCalls.length = 0
		mockAnswers = { ['GET']: listingAnswer(true) }
		global.__cnFileActions = [{ id: 'download', order: 1, displayName: () => 'Download', iconSvgInline: () => '<svg/>', exec: async () => true }]
		global.__cnNewMenuEntries = [{ id: 'file-request', displayName: 'Create file request', order: 1, handler: () => {} }]
	})

	afterEach(() => {
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
	})

	it('turns browser paths into folder paths relative to the object', () => {
		expect(toApiPath('/')).toBe('')
		expect(toApiPath('/Bijlagen/')).toBe('Bijlagen')
		expect(entryToNode(SUB_ENTRIES[0])).toMatchObject({ fileid: 201, basename: 'brief.txt', path: '/Bijlagen/brief.txt', type: 'file', mime: 'text/plain' })
		expect(entryToNode(ROOT_ENTRIES[1]).type).toBe('folder')
	})

	it('lists through the object folder endpoint, never WebDAV, and says whether the folder may change', async () => {
		const { folder, nodes } = await source().list('/Bijlagen')
		expect(mockCalls[0].method).toBe('GET')
		expect(mockCalls[0].url).toContain(`/apps/openregister/api${FOLDER}`)
		expect(mockCalls[0].options.params).toEqual({ path: 'Bijlagen' })
		expect(folder).toMatchObject({ path: '/Bijlagen', fileid: 200, canChange: true })
		expect(nodes.map((node) => node.path)).toEqual(['/Bijlagen/brief.txt'])
	})

	it('refuses a reply that is not a folder listing, so an older OpenRegister falls back', async () => {
		mockAnswers = { GET: { status: 200, data: {} } }
		await expect(source().list('/')).rejects.toMatchObject({ status: 501 })
	})

	it('carries the status and the server message on a refusal', async () => {
		mockAnswers = { GET: { status: 404, data: { error: 'Object not found' } } }
		await expect(source().list('/')).rejects.toMatchObject({ status: 404, message: 'Object not found' })
	})

	it('uploads into a subfolder as multipart form data with the relative path', async () => {
		mockAnswers.POST = { status: 201, data: { stored: [SUB_ENTRIES[0]], rejected: [] } }
		const node = await source().upload('/Bijlagen', new File(['hallo'], 'brief.txt', { type: 'text/plain' }))
		const post = mockCalls.find((call) => call.method === 'POST')
		expect(post.url).toContain(`${FOLDER}/upload`)
		expect(post.body.get('path')).toBe('Bijlagen')
		expect(post.body.get('files[]').name).toBe('brief.txt')
		expect(node.path).toBe('/Bijlagen/brief.txt')
	})

	it('downloads a file through the object file endpoint', () => {
		expect(source().downloadUrl(entryToNode(SUB_ENTRIES[0]))).toContain(`/objects/20/35/${OBJECT}/files/201`)
		expect(source().downloadUrl(entryToNode(ROOT_ENTRIES[1]))).toBeNull()
	})
})

describe('CnFilesBrowser with the OpenRegister source', () => {
	beforeEach(() => {
		mockCalls.length = 0
		mockAnswers = { GET: listingAnswer(true) }
		global.__cnFileActions = [{ id: 'download', order: 1, displayName: () => 'Download', iconSvgInline: () => '<svg/>', exec: async () => true }]
		global.__cnNewMenuEntries = [{ id: 'file-request', displayName: 'Create file request', order: 1, handler: () => {} }]
	})

	afterEach(() => {
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
	})

	it('lists the object folder, folders first, with the object title on the root crumb', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		const rows = wrapper.findAll('[data-testid="cn-files-browser-row"]')
		expect(rows.map((row) => row.attributes('data-name'))).toEqual(['Bijlagen', 'besluit.pdf'])
		expect(wrapper.vm.crumbs.map((crumb) => crumb.name)).toEqual(['Termijn eindigt vandaag'])
		expect(mockCalls.every((call) => !String(call.url).includes('remote.php'))).toBe(true)
		wrapper.unmount()
	})

	it('opens a subfolder through the source and puts it on the crumbs', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		await wrapper.vm.open(wrapper.vm.nodes.find((node) => node.basename === 'Bijlagen'))
		await flushPromises()
		expect(wrapper.vm.nodes.map((node) => node.basename)).toEqual(['brief.txt'])
		expect(wrapper.vm.crumbs.map((crumb) => crumb.name)).toEqual(['Termijn eindigt vandaag', 'Bijlagen'])
		wrapper.unmount()
	})

	it('offers none of the Files app actions or New entries, which act over WebDAV', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.vm.actionsFor(wrapper.vm.nodes[0])).toEqual([])
		expect(wrapper.vm.newMenuEntries).toEqual([])
		wrapper.unmount()
	})

	it('offers a reader who may not change the folder nothing that changes it', async () => {
		mockAnswers = { GET: listingAnswer(false) }
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.vm.canChange).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-new"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-upload-button"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-drop-hint"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-action-rename"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-action-delete"]').exists()).toBe(false)
		wrapper.vm.onDragEnter({ dataTransfer: { types: ['Files'] } })
		expect(wrapper.vm.dragging).toBe(false)
		await wrapper.vm.onDrop({ dataTransfer: { files: [new File(['x'], 'x.txt')] } })
		expect(mockCalls.some((call) => call.method === 'POST')).toBe(false)
		wrapper.unmount()
	})

	it('creates a folder, uploads, renames and deletes through the source', async () => {
		mockAnswers.POST = ({ url }) => (url.endsWith('/upload')
			? { status: 201, data: { stored: [SUB_ENTRIES[0]], rejected: [] } }
			: { status: 201, data: { id: 300, name: 'Stukken', type: 'folder', path: 'Stukken' } })
		mockAnswers.PUT = { status: 200, data: { ...ROOT_ENTRIES[0], name: 'besluit-2.pdf', path: 'besluit-2.pdf' } }
		mockAnswers.DELETE = { status: 200, data: { deleted: true } }
		const wrapper = mountBrowser()
		await flushPromises()

		wrapper.vm.newFolderName = 'Stukken'
		await wrapper.vm.createFolder()
		expect(mockCalls.find((call) => call.method === 'POST').body).toEqual({ path: '', name: 'Stukken' })

		await wrapper.vm.uploadFiles([new File(['hallo'], 'brief.txt', { type: 'text/plain' })])
		expect(mockCalls.some((call) => call.method === 'POST' && call.url.endsWith('/folder/upload'))).toBe(true)
		expect(wrapper.vm.uploads[0].progress).toBe(100)

		const pdf = wrapper.vm.nodes.find((node) => node.basename === 'besluit.pdf')
		wrapper.vm.askRename(pdf)
		wrapper.vm.renameName = 'besluit-2.pdf'
		await wrapper.vm.rename()
		const put = mockCalls.find((call) => call.method === 'PUT')
		expect(put.url).toContain(`${FOLDER}/101`)
		expect(put.body).toEqual({ name: 'besluit-2.pdf' })

		wrapper.vm.askRemove(pdf)
		await wrapper.vm.remove()
		expect(mockCalls.find((call) => call.method === 'DELETE').url).toContain(`${FOLDER}/101`)
		expect(wrapper.vm.removing).toBeNull()
		expect(wrapper.emitted('changed').length).toBeGreaterThanOrEqual(4)
		wrapper.unmount()
	})

	it('names a taken file name on the upload row', async () => {
		mockAnswers.POST = { status: 409, data: { error: 'A file or folder with that name is already here', stored: [], rejected: [{ name: 'brief.txt' }] } }
		const wrapper = mountBrowser()
		await flushPromises()
		await wrapper.vm.uploadFiles([new File(['x'], 'brief.txt')])
		expect(wrapper.vm.uploads[0].error).toBe('A file with that name is already here')
		wrapper.unmount()
	})

	it('says the files cannot be seen when the object refuses the listing', async () => {
		mockAnswers = { GET: { status: 404, data: { error: 'Object not found' } } }
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.vm.error).toBe('You cannot see these files')
		expect(wrapper.findAll('[data-testid="cn-files-browser-row"]')).toHaveLength(0)
		wrapper.unmount()
	})
})

describe('CnFilesTab picks the OpenRegister source by default', () => {
	beforeEach(() => {
		mockCalls.length = 0
	})

	it('defaults to openregister and keeps webdav', () => {
		expect(CnFilesTab.props.source.default).toBe('openregister')
		expect(CnFilesTab.props.source.validator('webdav')).toBe(true)
		expect(CnFilesTab.props.source.validator('ftp')).toBe(false)
	})

	it('shows the browser on the object folder for a reader, with the object title on the root crumb', async () => {
		mockAnswers = {
			['GET']: ({ url, options }) => (url.includes('/folder')
				? listingAnswer(false)({ options })
				: { status: 200, data: { title: 'Termijn eindigt vandaag', '@self': { id: OBJECT } } }),
		}
		const wrapper = mount(CnFilesTab, { propsData: { objectId: OBJECT, register: '20', schema: '35' } })
		await flushPromises()
		const browser = wrapper.findComponent(CnFilesBrowser)
		expect(browser.exists()).toBe(true)
		expect(browser.props('rootPath')).toBe('/')
		expect(browser.props('source')).not.toBeNull()
		expect(browser.props('rootLabel')).toBe('Termijn eindigt vandaag')
		expect(mockCalls.some((call) => String(call.url).includes('remote.php'))).toBe(false)
		wrapper.unmount()
	})

	it('keeps the legacy list for a person the object refuses', async () => {
		mockAnswers = { GET: ({ url }) => (url.includes('/folder') ? { status: 404, data: { error: 'Object not found' } } : { status: 200, data: {} }) }
		const wrapper = mount(CnFilesTab, { propsData: { objectId: OBJECT, register: '20', schema: '35' } })
		await flushPromises()
		expect(wrapper.findComponent(CnFilesBrowser).exists()).toBe(false)
		expect(wrapper.vm.browserSource).toBeNull()
		wrapper.unmount()
	})

	it('does not use the source when the host asks for webdav', async () => {
		mockAnswers = { GET: listingAnswer(true) }
		const wrapper = mount(CnFilesTab, { propsData: { objectId: OBJECT, register: '20', schema: '35', source: 'webdav' } })
		await flushPromises()
		expect(wrapper.vm.browserSource).toBeNull()
		expect(mockCalls.some((call) => String(call.url).includes('/folder'))).toBe(false)
		wrapper.unmount()
	})
})
