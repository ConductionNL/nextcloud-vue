/**
 * Tests for CnIndexPage's sidebar hoist via cnIndexSidebarConfig.
 *
 * When a CnAppRoot ancestor exposes the `cnIndexSidebarConfig` holder
 * AND the `cnHostsIndexSidebar: true` sentinel, CnIndexPage publishes
 * its embedded sidebar config to the holder INSTEAD of rendering
 * inline. This is what makes the sidebar appear at NcContent level
 * (the only spot where Nextcloud's NcAppSidebar slides correctly
 * from the right).
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const baseProps = {
	title: 'Decisions',
	schema: { title: 'Decision', properties: {} },
	objects: [],
}

function mountWithHost(extra = {}) {
	const holder = { value: null }
	const wrapper = mount(CnIndexPage, {
		propsData: { ...baseProps, ...extra },
		provide: {
			cnIndexSidebarConfig: holder,
			cnHostsIndexSidebar: true,
		},
		stubs: {
			CnDataTable: true,
			CnCardGrid: true,
			CnPagination: true,
			CnActionsBar: true,
			CnContextMenu: true,
		},
	})
	return { wrapper, holder }
}

describe('CnIndexPage — sidebar hoist', () => {
	describe('with CnAppRoot host (cnHostsIndexSidebar: true)', () => {
		it('publishes the sidebar config to the holder when sidebar.enabled', () => {
			const { holder } = mountWithHost({ sidebar: { enabled: true } })
			expect(holder.value).not.toBeNull()
			expect(holder.value.component).toBe(CnIndexSidebar)
			expect(holder.value.props.schema).toEqual(baseProps.schema)
			expect(holder.value.props.title).toBe('Decisions')
			expect(typeof holder.value.listeners.search).toBe('function')
		})

		it('does NOT render the inline sidebar when hoisting', () => {
			const { wrapper } = mountWithHost({ sidebar: { enabled: true } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(false)
		})

		it('clears the holder when sidebar is disabled', () => {
			const { holder } = mountWithHost({ sidebar: { enabled: false } })
			expect(holder.value).toBeNull()
		})

		it('clears the holder when sidebar.show is false', () => {
			const { holder } = mountWithHost({ sidebar: { enabled: true, show: false } })
			expect(holder.value).toBeNull()
		})

		it('clears the holder on beforeDestroy', () => {
			const { wrapper, holder } = mountWithHost({ sidebar: { enabled: true } })
			expect(holder.value).not.toBeNull()
			wrapper.destroy()
			expect(holder.value).toBeNull()
		})

		it('updates the published props when reactive state changes', async () => {
			const { wrapper, holder } = mountWithHost({
				sidebar: { enabled: true },
				searchValue: 'foo',
			})
			expect(holder.value.props.searchValue).toBe('foo')
			wrapper.setProps({ searchValue: 'bar' })
			await wrapper.vm.$nextTick()
			expect(holder.value.props.searchValue).toBe('bar')
		})

		it('listeners re-emit events on the CnIndexPage instance', () => {
			const { wrapper, holder } = mountWithHost({ sidebar: { enabled: true } })
			holder.value.listeners.search('hello')
			holder.value.listeners['columns-change'](['title'])
			holder.value.listeners['filter-change']({ key: 'status', values: ['open'] })
			expect(wrapper.emitted('search')[0]).toEqual(['hello'])
			expect(wrapper.emitted('columns-change')[0]).toEqual([['title']])
			expect(wrapper.emitted('filter-change')[0]).toEqual([{ key: 'status', values: ['open'] }])
		})
	})

	describe('without CnAppRoot host (default — legacy)', () => {
		it('renders the inline sidebar (legacy contract)', () => {
			const wrapper = mount(CnIndexPage, {
				propsData: { ...baseProps, sidebar: { enabled: true } },
				stubs: {
					CnDataTable: true,
					CnCardGrid: true,
					CnPagination: true,
					CnActionsBar: true,
					CnContextMenu: true,
				},
			})
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(true)
		})
	})
})
