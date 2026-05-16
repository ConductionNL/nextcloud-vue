/**
 * Tests for CnFilesPage.
 *
 * Covers Phase 4: empty state, populated state, allowedTypes filter,
 * header/actions slot override, files-view slot override.
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path, params) => {
		let resolved = `/index.php${path}`
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				resolved = resolved.replace(`{${k}}`, encodeURIComponent(v))
			}
		}
		return resolved
	}),
}))

import { mount } from '@vue/test-utils'
import CnFilesPage from '@/components/CnFilesPage/CnFilesPage.vue'

const stubs = {
	CnDataTable: {
		template: '<div class="cn-data-table-stub" />',
		props: ['columns', 'rows', 'rowKey', 'emptyText'],
	},
	CnPageHeader: {
		template: '<div class="cn-page-header-stub" />',
		props: ['title', 'description', 'icon'],
	},
}

describe('CnFilesPage', () => {
	it('renders empty-state when no files supplied', () => {
		const wrapper = mount(CnFilesPage, { propsData: { folder: '/x' }, stubs })
		expect(wrapper.find('.cn-files-page__empty').exists()).toBe(true)
	})

	it('renders the data-table when files are populated (populated state)', () => {
		const wrapper = mount(CnFilesPage, {
			propsData: {
				folder: '/x',
				files: [{ name: 'a.pdf', path: '/x/a.pdf', size: '1k', mtime: 't', mime: 'application/pdf' }],
			},
			stubs,
		})
		expect(wrapper.find('.cn-data-table-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-files-page__empty').exists()).toBe(false)
	})

	it('filters files by allowedTypes literal MIME', () => {
		const wrapper = mount(CnFilesPage, {
			propsData: {
				folder: '/x',
				allowedTypes: ['application/pdf'],
				files: [
					{ name: 'a.pdf', path: '/x/a.pdf', mime: 'application/pdf' },
					{ name: 'b.png', path: '/x/b.png', mime: 'image/png' },
				],
			},
			stubs,
		})
		expect(wrapper.vm.filteredFiles.map((f) => f.name)).toEqual(['a.pdf'])
	})

	it('filters files by allowedTypes wildcard MIME (image/*)', () => {
		const wrapper = mount(CnFilesPage, {
			propsData: {
				folder: '/x',
				allowedTypes: ['image/*'],
				files: [
					{ name: 'a.pdf', path: '/x/a.pdf', mime: 'application/pdf' },
					{ name: 'b.png', path: '/x/b.png', mime: 'image/png' },
					{ name: 'c.jpg', path: '/x/c.jpg', mime: 'image/jpeg' },
				],
			},
			stubs,
		})
		expect(wrapper.vm.filteredFiles.map((f) => f.name).sort()).toEqual(['b.png', 'c.jpg'])
	})

	it('honours the #header slot override (mirrors headerComponent dispatch)', () => {
		const wrapper = mount(CnFilesPage, {
			propsData: { folder: '/x' },
			stubs,
			scopedSlots: { header: '<div class="custom-header">Custom Files Header</div>' },
		})
		expect(wrapper.find('.custom-header').exists()).toBe(true)
	})

	it('honours the #actions slot override (mirrors actionsComponent dispatch)', () => {
		const wrapper = mount(CnFilesPage, {
			propsData: { folder: '/x' },
			stubs,
			slots: { actions: '<button class="custom-action">Upload</button>' },
		})
		expect(wrapper.find('.cn-files-page__actions').exists()).toBe(true)
		expect(wrapper.find('.custom-action').exists()).toBe(true)
	})

	it('honours the #files-view slot override entirely replacing the listing', () => {
		const wrapper = mount(CnFilesPage, {
			propsData: { folder: '/x' },
			stubs,
			scopedSlots: { 'files-view': '<div class="my-files">Custom listing</div>' },
		})
		expect(wrapper.find('.my-files').exists()).toBe(true)
		expect(wrapper.find('.cn-data-table-stub').exists()).toBe(false)
	})

	it('refresh() calls onRefresh when supplied', () => {
		const onRefresh = jest.fn()
		const wrapper = mount(CnFilesPage, {
			propsData: { folder: '/x', onRefresh },
			stubs,
		})
		wrapper.vm.refresh()
		expect(onRefresh).toHaveBeenCalled()
	})
})
