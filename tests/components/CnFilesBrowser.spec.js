/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'

const ROOT = '/files/admin/Open Registers/Cases/abc'

/** A listing: the folder itself first, then a subfolder and two files. */
function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		{ filename: `${ROOT}/Scans`, basename: 'Scans', type: 'directory', props: { fileid: 11 } },
		{ filename: `${ROOT}/report.pdf`, basename: 'report.pdf', type: 'file', mime: 'application/pdf', size: 2048, lastmod: '2026-09-01T10:00:00Z', props: { fileid: 12 } },
		{ filename: `${ROOT}/photo.png`, basename: 'photo.png', type: 'file', mime: 'image/png', size: 4096, lastmod: '2026-09-02T10:00:00Z', props: { fileid: 13 } },
	]
}

function mountBrowser() {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc' },
		global: { stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' } } },
	})
}

describe('CnFilesBrowser', () => {
	beforeEach(() => {
		global.__cnDavContents = listing()
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
	})

	afterEach(() => {
		delete global.__cnDavContents
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
		delete window.OCA
	})

	it('lists the folder over DAV, folders first, with the root crumb named by the caller', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		const rows = wrapper.findAll('[data-testid="cn-files-browser-row"]')
		expect(rows.map((row) => row.attributes('data-name'))).toEqual(['Scans', 'photo.png', 'report.pdf'])
		expect(wrapper.vm.crumbs.map((crumb) => [crumb.name, crumb.aboveRoot])).toEqual([['Open Registers', true], ['Cases', true], ['abc', false]])
		expect(wrapper.vm.folder.basename).toBe('abc')
		// The view handed to the Files app's actions carries the SVG icon its constructor demands.
		expect(wrapper.vm.view.icon).toMatch(/^<svg/)
		wrapper.unmount()
	})

	it('offers the actions the Files app registered, in their order, and never the ones that need its page', async () => {
		const seen = []
		global.__cnFileActions = [
			{ id: 'details', order: 0, displayName: () => 'Details', iconSvgInline: () => '<svg/>', exec: async () => true },
			{
				id: 'delete',
				order: 100,
				displayName: () => 'Delete',
				iconSvgInline: () => '<svg/>',
				exec: async (ctx) => {
					seen.push(ctx.nodes[0].basename)
					return true
				},
			},
			{ id: 'download', order: 30, displayName: () => 'Download', iconSvgInline: () => '<svg/>', exec: async () => true },
			{ id: 'rename', order: 10, displayName: () => 'Rename', iconSvgInline: () => '<svg/>', exec: async () => true },
			{ id: 'folder-only', order: 5, displayName: () => 'Folders', iconSvgInline: () => '<svg/>', enabled: (ctx) => ctx.nodes[0].type === 'folder', exec: async () => true },
			{ id: 'badge', order: 1, displayName: () => 'Badge', iconSvgInline: () => '<svg/>', inline: () => true, exec: async () => true },
			{ id: 'child', parent: 'delete', order: 2, displayName: () => 'Child', iconSvgInline: () => '<svg/>', exec: async () => true },
		]
		const wrapper = mountBrowser()
		await flushPromises()
		const pdf = wrapper.vm.nodes.find((node) => node.basename === 'report.pdf')
		expect(wrapper.vm.actionsFor(pdf).map((action) => action.id)).toEqual(['download', 'delete'])
		const scans = wrapper.vm.nodes.find((node) => node.basename === 'Scans')
		expect(wrapper.vm.actionsFor(scans).map((action) => action.id)).toEqual(['folder-only', 'download', 'delete'])

		await wrapper.vm.run(global.__cnFileActions[1], pdf)
		expect(seen).toEqual(['report.pdf'])
		expect(wrapper.emitted('changed')).toHaveLength(1)
		wrapper.unmount()
	})

	it('runs a New menu entry the plugins registered, but answers New folder itself', async () => {
		const handled = []
		global.__cnNewMenuEntries = [
			{ id: 'file-request', displayName: 'Create file request', order: 10, handler: (folder) => handled.push(folder.basename) },
			{ id: 'newFolder', displayName: 'New folder', order: 0, handler: () => handled.push('files-app-inline-rename') },
		]
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.vm.newMenuEntries.map((entry) => entry.id)).toEqual(['newFolder', 'file-request'])
		await wrapper.vm.runNewEntry(global.__cnNewMenuEntries[0])
		expect(handled).toEqual(['abc'])
		await wrapper.vm.runNewEntry(global.__cnNewMenuEntries[1])
		expect(handled).toEqual(['abc'])
		expect(wrapper.vm.newFolderOpen).toBe(true)
		wrapper.unmount()
	})

	it('creates a folder over DAV under the open folder and refuses a name that is taken', async () => {
		const { __calls } = require('../../tests/__mocks__/nextcloud-files-dav.js')
		__calls.createDirectory.length = 0
		const wrapper = mountBrowser()
		await flushPromises()
		wrapper.vm.newFolderOpen = true
		wrapper.vm.newFolderName = 'Scans'
		await wrapper.vm.createFolder()
		expect(wrapper.vm.newFolderError).not.toBe('')
		expect(__calls.createDirectory).toEqual([])
		wrapper.vm.newFolderName = 'Letters'
		await wrapper.vm.createFolder()
		expect(__calls.createDirectory).toEqual(['/files/admin/Open Registers/Cases/abc/Letters'])
		expect(wrapper.vm.newFolderOpen).toBe(false)
		wrapper.unmount()
	})

	it('uploads into the open folder with a DAV PUT that refuses to overwrite, and reports the folder changed', async () => {
		const axios = require('@nextcloud/axios').default
		axios.__puts.length = 0
		const wrapper = mountBrowser()
		await flushPromises()
		await wrapper.vm.uploadFiles([new File(['x'], 'note.txt', { type: 'text/plain' })])
		expect(axios.__puts).toHaveLength(1)
		expect(axios.__puts[0].url).toBe('http://localhost/remote.php/dav/files/admin/Open Registers/Cases/abc/note.txt')
		expect(axios.__puts[0].options.headers['If-None-Match']).toBe('*')
		expect(wrapper.vm.uploads[0].progress).toBe(100)
		expect(wrapper.emitted('changed')).toHaveLength(1)
		wrapper.unmount()
	})

	it('renames through a DAV move within the folder, and refuses a taken name or a slash', async () => {
		const { __calls } = require('../../tests/__mocks__/nextcloud-files-dav.js')
		__calls.moveFile.length = 0
		const wrapper = mountBrowser()
		await flushPromises()
		const pdf = wrapper.vm.nodes.find((node) => node.basename === 'report.pdf')
		wrapper.vm.askRename(pdf)
		expect(wrapper.vm.renameName).toBe('report.pdf')
		wrapper.vm.renameName = 'photo.png'
		await wrapper.vm.rename()
		expect(wrapper.vm.renameError).not.toBe('')
		wrapper.vm.renameName = 'a/b.pdf'
		await wrapper.vm.rename()
		expect(wrapper.vm.renameError).not.toBe('')
		expect(__calls.moveFile).toEqual([])
		wrapper.vm.renameName = 'final report.pdf'
		await wrapper.vm.rename()
		expect(__calls.moveFile).toEqual([['/files/admin/Open Registers/Cases/abc/report.pdf', '/files/admin/Open Registers/Cases/abc/final report.pdf']])
		expect(wrapper.vm.renaming).toBeNull()
		wrapper.unmount()
	})

	it('never navigates above its root', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		wrapper.vm.navigate('/Open Registers')
		expect(wrapper.vm.currentPath).toBe('/Open Registers/Cases/abc')
		wrapper.vm.navigate('/Open Registers/Cases/abc/Scans')
		expect(wrapper.vm.currentPath).toBe('/Open Registers/Cases/abc/Scans')
		expect(wrapper.vm.crumbs.map((crumb) => crumb.name)).toEqual(['Open Registers', 'Cases', 'abc', 'Scans'])
		wrapper.unmount()
	})

	it('offers the host\'s own New menu entries, dispatched with the folder rather than a row', async () => {
		const dispatched = []
		const wrapper = mount(CnFilesBrowser, {
			propsData: {
				rootPath: '/Open Registers/Cases/abc',
				newActions: [
					{ id: 'request-file', label: 'Request a file from a party', icon: 'AccountArrowRightOutline', type: 'open-modal', target: 'FileRequestDialog', props: { caseId: 'abc' } },
				],
			},
			global: {
				stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' } },
				provide: { cnDispatchAction: (action) => dispatched.push(action) },
			},
		})
		await flushPromises()

		const entry = wrapper.find('[data-testid="cn-files-browser-new-host-request-file"]')
		expect(entry.text()).toBe('Request a file from a party')

		await entry.trigger('click')

		expect(dispatched).toHaveLength(1)
		expect(dispatched[0].target).toBe('FileRequestDialog')
		// No row was clicked, so the folder is the context: the caller's own
		// props survive and the path is the folder's, with no file id.
		expect(dispatched[0].props).toMatchObject({ caseId: 'abc', path: '/Open Registers/Cases/abc' })
		expect(dispatched[0].props.fileId).toBeUndefined()
		wrapper.unmount()
	})

	it('offers the host\'s own actions on files, never on folders, and dispatches them with the file merged in', async () => {
		const dispatched = []
		const wrapper = mount(CnFilesBrowser, {
			propsData: {
				rootPath: '/Open Registers/Cases/abc',
				rowActions: [
					{ id: 'document-properties', label: 'Document properties', icon: 'FileDocumentEditOutline', type: 'open-modal', target: 'DocumentMetadataDialog', props: { caseId: 'abc' } },
					{ id: 'stamp', label: 'Stamp', type: 'handler', handler: 'stamp', args: ['first'] },
				],
			},
			global: {
				stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' } },
				provide: { cnDispatchAction: (action) => dispatched.push(action) },
			},
		})
		await flushPromises()

		const rows = wrapper.findAll('[data-testid="cn-files-browser-row"]')
		const folderRow = rows.find((row) => row.attributes('data-name') === 'Scans')
		const fileRow = rows.find((row) => row.attributes('data-name') === 'report.pdf')
		expect(folderRow.find('[data-testid="cn-files-browser-host-action-document-properties"]').exists()).toBe(false)
		expect(fileRow.find('[data-testid="cn-files-browser-host-action-document-properties"]').text()).toBe('Document properties')

		await fileRow.find('[data-testid="cn-files-browser-host-action-document-properties"]').trigger('click')
		await fileRow.find('[data-testid="cn-files-browser-host-action-stamp"]').trigger('click')

		expect(dispatched).toHaveLength(2)
		expect(dispatched[0].type).toBe('open-modal')
		expect(dispatched[0].target).toBe('DocumentMetadataDialog')
		expect(dispatched[0].props).toMatchObject({ caseId: 'abc', fileId: 12, fileName: 'report.pdf' })
		expect(dispatched[1].type).toBe('handler')
		expect(dispatched[1].args[0]).toBe('first')
		expect(dispatched[1].args[1].basename).toBe('report.pdf')
		wrapper.unmount()
	})

	it('lists the host\'s linked items after the folder\'s rows, with open and download and nothing that changes the file', async () => {
		const wrapper = mount(CnFilesBrowser, {
			propsData: {
				rootPath: '/Open Registers/Cases/abc',
				linkedItems: [
					{ id: 'io-1', name: 'besluit.pdf', mime: 'application/pdf', size: 1024, href: '/f/900', downloadHref: '/download/900', note: 'In case 2026-0042', noteHref: '/apps/dossiq/cases/other' },
				],
			},
			global: { stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' } } },
		})
		await flushPromises()

		const own = wrapper.findAll('[data-testid="cn-files-browser-row"]').map((row) => row.attributes('data-name'))
		expect(own).toEqual(['Scans', 'photo.png', 'report.pdf'])
		const linked = wrapper.findAll('[data-testid="cn-files-browser-linked-row"]')
		expect(linked).toHaveLength(1)
		expect(linked[0].text()).toContain('besluit.pdf')
		expect(linked[0].find('.cn-files-browser__note-link').attributes('href')).toBe('/apps/dossiq/cases/other')
		expect(linked[0].find('[data-testid="cn-files-browser-linked-open"]').attributes('href')).toBe('/f/900')
		expect(linked[0].find('[data-testid="cn-files-browser-linked-download"]').attributes('href')).toBe('/download/900')
		expect(linked[0].find('[data-testid="cn-files-browser-action-rename"]').exists()).toBe(false)
		expect(linked[0].find('[data-testid^="cn-files-browser-host-action-"]').exists()).toBe(false)
		// The rows come after the folder's own rows in document order.
		const all = wrapper.findAll('tbody tr').map((row) => row.attributes('data-testid'))
		expect(all.at(-1)).toBe('cn-files-browser-linked-row')
		wrapper.unmount()
	})

	it('shows the linked items instead of the empty state when the folder itself is empty', async () => {
		global.__cnDavContents = [listing()[0]]
		const wrapper = mount(CnFilesBrowser, {
			propsData: { rootPath: '/Open Registers/Cases/abc', linkedItems: [{ id: 'io-1', name: 'besluit.pdf', href: '/f/900' }] },
			global: { stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' } } },
		})
		await flushPromises()
		expect(wrapper.findAll('[data-testid="cn-files-browser-linked-row"]')).toHaveLength(1)
		expect(wrapper.text()).not.toContain('This folder is empty')
		wrapper.unmount()
	})
})
