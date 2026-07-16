/**
 * Tests for the `files` dashboard widget form + registration completion
 * (cn-widget-library Wave 1). The renderer already existed; this covers the
 * new form and the now-present registry entry after importing the renderer's
 * self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnFilesWidgetForm from '@/components/CnFilesWidgetForm/CnFilesWidgetForm.vue'

describe('CnFilesWidgetForm', () => {
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

	it('coerces a fileId from the text field', () => {
		const wrapper = mount(CnFilesWidgetForm)
		wrapper.vm.updateFileId('42')
		expect(wrapper.vm.fileId).toBe(42)
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
