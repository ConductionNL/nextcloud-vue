/**
 * Tests for CnIndexPage's manifest-driven sidebar prop.
 *
 * Covers REQ-MAS-1 from the manifest-abstract-sidebar spec — the new
 * `sidebar` prop that auto-mounts an embedded CnIndexSidebar when
 * `enabled`. The legacy slot-based interface (consumer wires their
 * own CnIndexSidebar at App.vue level) is preserved when the prop is
 * unset.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const baseProps = {
	title: 'Decisions',
	schema: { title: 'Decision', properties: {} },
	objects: [],
}

function mountIndexPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: { ...baseProps, ...extra },
		stubs: {
			// Heavy children stubbed to keep the test focused on the
			// sidebar wiring; the real CnIndexSidebar IS mounted (we
			// need to assert it appears in the tree).
			CnDataTable: true,
			CnCardGrid: true,
			CnPagination: true,
			CnActionsBar: true,
			CnContextMenu: true,
		},
		// CnIndexSidebar uses NcCheckboxRadioSwitch which is stubbed
		// by the @nextcloud/vue mock — it's a div, fine for our purposes.
	})
}

describe('CnIndexPage — sidebar prop', () => {
	describe('default (sidebar unset)', () => {
		it('does NOT mount an embedded CnIndexSidebar when sidebar is unset', () => {
			const wrapper = mountIndexPage()
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(false)
		})

		it('exposes resolvedSidebar.enabled === false when sidebar is null', () => {
			const wrapper = mountIndexPage()
			expect(wrapper.vm.resolvedSidebar.enabled).toBe(false)
		})
	})

	describe('sidebar.enabled === false', () => {
		it('does NOT mount the sidebar when explicitly disabled', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: false } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(false)
		})
	})

	describe('sidebar.enabled === true', () => {
		it('mounts an embedded CnIndexSidebar exactly once', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true } })
			const sidebars = wrapper.findAllComponents(CnIndexSidebar)
			expect(sidebars.length).toBe(1)
		})

		it('forwards the schema prop to the embedded sidebar', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true } })
			expect(wrapper.findComponent(CnIndexSidebar).props('schema')).toBe(baseProps.schema)
		})

		it('forwards columnGroups', () => {
			const groups = [{ id: 'extra', label: 'Extra', columns: [{ key: 'foo', label: 'Foo' }] }]
			const wrapper = mountIndexPage({ sidebar: { enabled: true, columnGroups: groups } })
			expect(wrapper.findComponent(CnIndexSidebar).props('columnGroups')).toBe(groups)
		})

		it('forwards facets as facetData', () => {
			const facets = { status: { values: [{ value: 'open', count: 3 }] } }
			const wrapper = mountIndexPage({ sidebar: { enabled: true, facets } })
			expect(wrapper.findComponent(CnIndexSidebar).props('facetData')).toBe(facets)
		})

		it('forwards showMetadata (defaults to true)', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true } })
			expect(wrapper.findComponent(CnIndexSidebar).props('showMetadata')).toBe(true)
		})

		it('respects showMetadata: false', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true, showMetadata: false } })
			expect(wrapper.findComponent(CnIndexSidebar).props('showMetadata')).toBe(false)
		})

		it('forwards search sub-block fields via v-bind', () => {
			const wrapper = mountIndexPage({
				sidebar: {
					enabled: true,
					search: { searchPlaceholder: 'Find...', filtersLabel: 'Refine' },
				},
			})
			const sb = wrapper.findComponent(CnIndexSidebar)
			expect(sb.props('searchPlaceholder')).toBe('Find...')
			expect(sb.props('filtersLabel')).toBe('Refine')
		})

		it('re-emits @search from the embedded sidebar', async () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true } })
			wrapper.findComponent(CnIndexSidebar).vm.$emit('search', 'foo')
			await wrapper.vm.$nextTick()
			expect(wrapper.emitted('search')).toEqual([['foo']])
		})

		it('re-emits @columns-change from the embedded sidebar', async () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true } })
			wrapper.findComponent(CnIndexSidebar).vm.$emit('columns-change', ['a', 'b'])
			await wrapper.vm.$nextTick()
			expect(wrapper.emitted('columns-change')).toEqual([[['a', 'b']]])
		})

		it('re-emits @filter-change from the embedded sidebar', async () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true } })
			wrapper.findComponent(CnIndexSidebar).vm.$emit('filter-change', { key: 'status', values: ['open'] })
			await wrapper.vm.$nextTick()
			expect(wrapper.emitted('filter-change')).toEqual([[{ key: 'status', values: ['open'] }]])
		})
	})
})
