/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The host chooses the bar's actions: `newMenu: false` leaves the New menu
 * out, so the bar holds only the host's buttons and the upload button
 * (DqZaakDocumenten: "Vraag een bestand aan een partij" and "Bestanden
 * toevoegen", no "Nieuw"). `folderButton: true` puts New folder in the bar
 * as a button, so a bar without the menu still creates folders.
 *
 * @spec openspec/changes/files-browser-toolbar-actions/specs/files-browser/spec.md#requirement-the-host-chooses-whether-the-bar-has-a-new-menu
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'

const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' }, CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } }

function mountBrowser(propsData = {}) {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', ...propsData },
		global: { stubs: STUBS, provide: { cnDispatchAction: () => {} } },
	})
}

const REQUEST = { id: 'request-file', label: 'Vraag een bestand aan een partij', type: 'open-modal', target: 'FileRequestDialog' }

describe('CnFilesBrowser newMenu', () => {
	it('draws the New menu by default', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-browser-new"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('leaves the New menu out with newMenu: false, keeping the host buttons and the upload button', async () => {
		const wrapper = mountBrowser({ newMenu: false, uploadButton: true, headerActions: [REQUEST] })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-browser-new"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-header-action-request-file"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-files-browser-upload-button"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('draws a New folder button when the host turns it on, which opens the new-folder dialog', async () => {
		const wrapper = mountBrowser({ newMenu: false, folderButton: true })
		await flushPromises()
		const button = wrapper.find('[data-testid="cn-files-browser-new-folder-button"]')
		expect(button.exists()).toBe(true)
		expect(button.text()).toContain('New folder')
		await button.trigger('click')
		expect(wrapper.vm.newFolderOpen).toBe(true)
		wrapper.unmount()
	})

	it('draws no New folder button by default', async () => {
		const wrapper = mountBrowser({ newMenu: false })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-browser-new-folder-button"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('is forwarded by the files tab', () => {
		expect(CnFilesTab.props.newMenu).toMatchObject({ type: Boolean, default: true })
		expect(CnFilesTab.props.folderButton).toMatchObject({ type: Boolean, default: false })
	})
})
