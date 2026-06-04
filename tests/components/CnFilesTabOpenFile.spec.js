/**
 * Regression tests for CnFilesTab.openFile safeHref fix (C4).
 *
 * Covers the fix in CnObjectSidebar/CnFilesTab.vue: window.open must
 * validate file.accessUrl through safeHref before navigating. A
 * javascript: or data: URL supplied from a misbehaving OR file record
 * must NOT reach window.open, and a legitimate https URL must still open.
 */

const { mount } = require('@vue/test-utils')

// Mock heavy icon components
jest.mock('vue-material-design-icons/Delete.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/FileOutline.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/OpenInNew.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/Upload.vue', () => ({ template: '<span/>' }), { virtual: true })

const CnFilesTab = require('../../src/components/CnObjectSidebar/CnFilesTab.vue').default

function mountTab(overrideProps = {}) {
	return mount(CnFilesTab, {
		propsData: {
			objectId: 'obj-1',
			register: 'test-register',
			schema: 'test-schema',
			...overrideProps,
		},
	})
}

describe('CnFilesTab.openFile — safeHref protection (C4)', () => {
	let windowOpenSpy

	beforeEach(() => {
		windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ results: [], total: 0 }),
		})
	})

	afterEach(() => {
		windowOpenSpy.mockRestore()
		delete global.fetch
	})

	it('opens a safe https:// accessUrl with noopener,noreferrer', () => {
		const wrapper = mountTab()
		wrapper.vm.openFile({ accessUrl: 'https://cdn.example.com/file.pdf' })

		expect(windowOpenSpy).toHaveBeenCalledTimes(1)
		expect(windowOpenSpy).toHaveBeenCalledWith(
			'https://cdn.example.com/file.pdf',
			'_blank',
			'noopener,noreferrer',
		)
		wrapper.destroy()
	})

	it('does NOT open a javascript: accessUrl (C4 regression)', () => {
		const wrapper = mountTab()
		wrapper.vm.openFile({ accessUrl: 'javascript:alert(document.cookie)' })

		// window.open must NOT have been called with a javascript: URL
		const unsafeCalls = windowOpenSpy.mock.calls.filter(
			(args) => typeof args[0] === 'string' && args[0].startsWith('javascript:'),
		)
		expect(unsafeCalls).toHaveLength(0)
		wrapper.destroy()
	})

	it('does NOT open a data: accessUrl', () => {
		const wrapper = mountTab()
		wrapper.vm.openFile({ accessUrl: 'data:text/html,<script>alert(1)<\/script>' })

		const unsafeCalls = windowOpenSpy.mock.calls.filter(
			(args) => typeof args[0] === 'string' && args[0].startsWith('data:'),
		)
		expect(unsafeCalls).toHaveLength(0)
		wrapper.destroy()
	})

	it('falls back to NC files URL path when accessUrl is absent and file.id present', () => {
		const wrapper = mountTab()
		wrapper.vm.openFile({ id: '999', path: '/admin/files/docs/report.pdf' })

		expect(windowOpenSpy).toHaveBeenCalledTimes(1)
		const [url] = windowOpenSpy.mock.calls[0]
		expect(url).toContain('/files/999')
		wrapper.destroy()
	})
})
