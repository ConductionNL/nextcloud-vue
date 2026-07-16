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

	// REQ-MDSC-4 — `sidebar.show` visibility gate (manifest-detail-sidebar-config).
	// `enabled` (existence gate) and `show` (visibility gate) are
	// distinct: `enabled` controls whether the auto-mount path runs at
	// all; `show` lets manifest authors hide the configured sidebar
	// without removing the rest of the config (e.g. for a responsive
	// layout watcher).
	describe('sidebar.show flag', () => {
		it('show defaults to true — embedded sidebar renders', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(true)
		})

		it('show: true explicitly — embedded sidebar renders', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true, show: true } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(true)
		})

		it('show: false suppresses the embedded sidebar even when enabled', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true, show: false } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(false)
		})

		it('enabled: false short-circuits regardless of show', () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: false, show: true } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(false)
		})

		it('toggles when show prop changes reactively', async () => {
			const wrapper = mountIndexPage({ sidebar: { enabled: true, show: true } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(true)
			await wrapper.setProps({ sidebar: { enabled: true, show: false } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(false)
			await wrapper.setProps({ sidebar: { enabled: true, show: true } })
			expect(wrapper.findComponent(CnIndexSidebar).exists()).toBe(true)
		})
	})

	// The Columns tab toggles column visibility by emitting the new visible
	// key set. CnDataTable ignores include/exclude-columns when an explicit
	// `columns` list is given, so CnIndexPage must filter `tableColumns`
	// itself — otherwise the table never reflects the toggle.
	describe('column visibility (Columns tab)', () => {
		const schema = {
			title: 'Client',
			properties: {
				name: { type: 'string' },
				type: { type: 'string' },
				industry: { type: 'string' },
			},
		}
		const colKeys = (cols) => cols.map((c) => (typeof c === 'string' ? c : c.key))

		it('shows all configured columns when no visible set is given', () => {
			const wrapper = mountIndexPage({ schema, columns: ['name', 'type', 'industry'], visibleColumns: null })
			expect(colKeys(wrapper.vm.tableColumns)).toEqual(['name', 'type', 'industry'])
		})

		it('hides a schema column the user toggled off', () => {
			const wrapper = mountIndexPage({ schema, columns: ['name', 'type', 'industry'], visibleColumns: ['name', 'type'] })
			expect(colKeys(wrapper.vm.tableColumns)).toEqual(['name', 'type'])
		})

		it('keeps custom non-schema columns the sidebar does not govern', () => {
			// `custom` has no checkbox in the sidebar, so it must survive even
			// though it is absent from the visible set.
			const wrapper = mountIndexPage({ schema, columns: ['name', 'custom'], visibleColumns: ['name'] })
			expect(colKeys(wrapper.vm.tableColumns)).toEqual(['name', 'custom'])
		})

		it('reacts when the visible set changes', async () => {
			const wrapper = mountIndexPage({ schema, columns: ['name', 'type', 'industry'], visibleColumns: null })
			await wrapper.setProps({ visibleColumns: ['name', 'industry'] })
			expect(colKeys(wrapper.vm.tableColumns)).toEqual(['name', 'industry'])
		})

		it('appends a metadata column the user enabled (not in the configured list)', () => {
			// `created` is a built-in Metadata-group column, absent from `columns`.
			// Enabling it must synthesise a definition and append it to the table.
			const wrapper = mountIndexPage({ schema, columns: ['name', 'type'], visibleColumns: ['name', 'type', 'created'] })
			const cols = wrapper.vm.tableColumns
			expect(colKeys(cols)).toEqual(['name', 'type', 'created'])
			// Synthesised def carries the metadata label.
			expect(cols.find((c) => c.key === 'created')).toMatchObject({ key: 'created', label: 'Created' })
		})

		it('appends a schema column beyond the configured default set', () => {
			const wrapper = mountIndexPage({ schema, columns: ['name'], visibleColumns: ['name', 'industry'] })
			expect(colKeys(wrapper.vm.tableColumns)).toEqual(['name', 'industry'])
		})

		it('does not append unknown keys the sidebar does not govern', () => {
			const wrapper = mountIndexPage({ schema, columns: ['name'], visibleColumns: ['name', 'bogus'] })
			expect(colKeys(wrapper.vm.tableColumns)).toEqual(['name'])
		})
	})
})
