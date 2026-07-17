/**
 * Tests for the `files` dashboard widget form + registration completion
 * (cn-widget-library Wave 1). The renderer already existed; this covers the
 * form (now folder-picker driven) and the registry entry after importing the
 * renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnFilesWidgetForm from '@/components/CnFilesWidgetForm/CnFilesWidgetForm.vue'

// The folder picker is driven by @nextcloud/dialogs' builder. Mock it so the
// builder chain is inert and `pickNodes()` resolves with a canned node.
// Must be `mock`-prefixed so jest allows the hoisted factory to reference it.
const mockPickNodes = jest.fn()
jest.mock('@nextcloud/dialogs', () => ({
	getFilePickerBuilder: jest.fn(() => {
		const builder = {
			setMultiSelect: () => builder,
			setMimeTypeFilter: () => builder,
			allowDirectories: () => builder,
			startAt: () => builder,
			addButton: () => builder,
			build: () => ({ pickNodes: mockPickNodes }),
		}
		return builder
	}),
}))

describe('CnFilesWidgetForm', () => {
	beforeEach(() => {
		mockPickNodes.mockReset()
	})

	it('emits the assembled shape on a folder-path edit', () => {
		const wrapper = mount(CnFilesWidgetForm)
		wrapper.vm.updateField('folderPath', '/Documents')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload).toMatchObject({
			folderPath: '/Documents',
			viewMode: 'list',
			sortBy: 'name',
			allowUpload: false,
		})
	})

	it('validate requires a folder path or folder id', () => {
		const wrapper = mount(CnFilesWidgetForm)
		// folderPath defaults to '/' (so a new Files widget shows root); clear it
		// first to exercise the empty case.
		wrapper.vm.updateField('folderPath', '')
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
		wrapper.vm.updateField('folderPath', '/Docs')
		expect(wrapper.vm.validate()).toEqual([])
	})

	it('sets folderPath and fileId from the picked folder node', async () => {
		mockPickNodes.mockResolvedValue([{ path: '/Docs', fileid: 42 }])
		const wrapper = mount(CnFilesWidgetForm)
		await wrapper.vm.openFolderPicker()
		expect(wrapper.vm.folderPath).toBe('/Docs')
		expect(wrapper.vm.fileId).toBe(42)
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload).toMatchObject({ folderPath: '/Docs', fileId: 42 })
	})

	it('leaves the selection untouched when the picker is cancelled', async () => {
		mockPickNodes.mockRejectedValue(new Error('FilePicker: No nodes selected'))
		const wrapper = mount(CnFilesWidgetForm, {
			propsData: { value: { folderPath: '/Keep', fileId: 7 } },
		})
		await wrapper.vm.openFolderPicker()
		expect(wrapper.vm.folderPath).toBe('/Keep')
		expect(wrapper.vm.fileId).toBe(7)
	})
})

describe('files registry registration', () => {
	it('registers the files type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnFilesWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('files')
		expect(entry).not.toBeNull()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent.viewMode).toBe('list')
	})
})
