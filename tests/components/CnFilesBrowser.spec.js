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
		propsData: { rootPath: '/Open Registers/Cases/abc', rootLabel: 'Files' },
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
		expect(wrapper.vm.crumbs).toEqual([{ name: 'Files', path: '/Open Registers/Cases/abc' }])
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

	it('uploads into the open folder over DAV and reports the folder changed', async () => {
		const { __calls } = require('../../tests/__mocks__/nextcloud-files-dav.js')
		__calls.putFileContents.length = 0
		const wrapper = mountBrowser()
		await flushPromises()
		await wrapper.vm.uploadFiles([new File(['x'], 'note.txt', { type: 'text/plain' })])
		expect(__calls.putFileContents).toEqual(['/files/admin/Open Registers/Cases/abc/note.txt'])
		expect(wrapper.emitted('changed')).toHaveLength(1)
		wrapper.unmount()
	})

	it('never navigates above its root', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		wrapper.vm.navigate('/Open Registers')
		expect(wrapper.vm.currentPath).toBe('/Open Registers/Cases/abc')
		wrapper.vm.navigate('/Open Registers/Cases/abc/Scans')
		expect(wrapper.vm.currentPath).toBe('/Open Registers/Cases/abc/Scans')
		expect(wrapper.vm.crumbs.map((crumb) => crumb.name)).toEqual(['Files', 'Scans'])
		wrapper.unmount()
	})
})
