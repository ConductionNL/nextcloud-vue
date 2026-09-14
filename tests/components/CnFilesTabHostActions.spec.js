/**
 * The files tab forwards the host's own actions to the browser.
 *
 * A manifest declares `rowActions` and `newActions` on a files widget, and
 * the tab is what renders the browser: a prop the tab does not declare is
 * dropped in silence, so the entry is simply absent from the menu with no
 * warning anywhere. Measured 2026-09-13: `newActions` reached CnFilesBrowser
 * from nowhere, because only `rowActions` was forwarded.
 */

const { flushPromises, mount } = require('@vue/test-utils')

jest.mock('vue-material-design-icons/Delete.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/FileOutline.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/OpenInNew.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/Upload.vue', () => ({ template: '<span/>' }), { virtual: true })

const CnFilesTab = require('../../src/components/CnObjectSidebar/CnFilesTab.vue').default
const CnFilesBrowser = require('../../src/components/CnFilesBrowser/CnFilesBrowser.vue').default

const ROW_ACTIONS = [{ id: 'document-properties', label: 'Document properties', type: 'open-modal', target: 'DocumentMetadataDialog' }]
const NEW_ACTIONS = [{ id: 'request-file', label: 'Request a file from a party', type: 'open-modal', target: 'FileRequestDialog' }]

describe('CnFilesTab host actions', () => {
	it('declares both host-action props, so a manifest that sets them is not dropped', () => {
		const props = CnFilesTab.props

		expect(props.rowActions).toBeTruthy()
		// Declared, or a manifest that sets it is dropped in silence.
		expect(props.newActions).toBeTruthy()
		expect(props.rowActions.default()).toEqual([])
		expect(props.newActions.default()).toEqual([])
	})

	it('hands both through to the files browser', async () => {
		const wrapper = mount(CnFilesTab, {
			propsData: {
				objectId: 'obj-1',
				register: 'test-register',
				schema: 'test-schema',
				rowActions: ROW_ACTIONS,
				newActions: NEW_ACTIONS,
			},
		})
		// The tab resolves the folder itself and answers null here (no WebDAV in
		// jsdom), so let that settle before standing the browser up: the
		// binding is what this asserts, not the folder lookup.
		await flushPromises()
		wrapper.vm.browserRoot = '/Open Registers/Cases/obj-1'
		await wrapper.vm.$nextTick()

		const browser = wrapper.findComponent(CnFilesBrowser)
		expect(browser.exists()).toBe(true)
		expect(browser.props('rowActions')).toEqual(ROW_ACTIONS)
		expect(browser.props('newActions')).toEqual(NEW_ACTIONS)
		wrapper.unmount()
	})
})
