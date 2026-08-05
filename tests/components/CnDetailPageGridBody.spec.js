// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnDetailPage's adjustable body grid (GridStack).
 *
 * The detail body is, at its core, a real drag/resize grid:
 *   - In schema-driven mode with a loaded object it seeds a default layout of
 *     a `data` widget + a `related` widget (the auto-body, now grid-backed).
 *   - An explicit `layout` + `widgets` pair (manifest grid page) feeds the same
 *     engine.
 *   - A drag/resize (`onBodyLayoutChange`) sticks locally for the default body
 *     and emits `layout-change` / `update:layout` for explicit-layout pages.
 *   - The default widgets are configurable / removable (cog → editor) via the
 *     materialized auto-body arrays.
 *
 * GridStack is stubbed via the global mock so the engine init is a no-op under
 * jsdom; assertions target the component's reactive grid state, not GridStack.
 */

import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function storeWithObject() {
	return {
		objects: { 'r-s': { 'o-1': { id: 'o-1', name: 'Rex' } } },
		schemas: { 'r-s': { properties: { name: { type: 'string' } } } },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountSchemaDriven(extra = {}) {
	return mount(CnDetailPage, {
		propsData: {
			register: 'r',
			schema: 's',
			objectId: 'o-1',
			objectStore: storeWithObject(),
			...extra,
		},
	})
}

describe('CnDetailPage — adjustable body grid', () => {
	describe('default Data + Related body', () => {
		it('materializes a data + related default layout when the object loads', async () => {
			const wrapper = mountSchemaDriven()
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.shouldRenderAutoBody).toBe(true)
			expect(wrapper.vm.hasBodyGrid).toBe(true)

			const ids = wrapper.vm.bodyGridLayout.map((l) => l.widgetId)
			expect(ids).toEqual(['data', 'related'])

			const types = wrapper.vm.bodyGridWidgets.map((w) => w.type)
			expect(types).toEqual(['data', 'related'])
		})

		it('renders the CnDashboardGrid (drag/resize engine) for the body', async () => {
			const wrapper = mountSchemaDriven()
			await wrapper.vm.$nextTick()
			expect(wrapper.findComponent({ name: 'CnDashboardGrid' }).exists()).toBe(true)
		})

		it('drops the Related widget when showRelatedObjects is false', async () => {
			const wrapper = mountSchemaDriven({ showRelatedObjects: false })
			await wrapper.vm.$nextTick()
			const ids = wrapper.vm.bodyGridLayout.map((l) => l.widgetId)
			expect(ids).toEqual(['data'])
		})
	})

	describe('grid section title (no duplicate with the widget header)', () => {
		it('does not render a grid <h3> for built-in widgets (they own their header)', async () => {
			const wrapper = mountSchemaDriven()
			await wrapper.vm.$nextTick()
			const dataItem = wrapper.vm.bodyGridLayout.find((l) => l.widgetId === 'data')
			// No consumer #widget-data slot → built-in dispatch → suppress the heading
			expect(wrapper.vm.showGridTitle(dataItem)).toBe(false)
			expect(wrapper.find('.cn-detail-page__widget-title').exists()).toBe(false)
		})

		it('renders a grid <h3> for a consumer-supplied widget slot', async () => {
			const wrapper = mount(CnDetailPage, {
				propsData: {
					layout: [{ id: 1, widgetId: 'custom', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }],
					widgets: [{ id: 'custom', type: 'stat', title: 'My section' }],
				},
				scopedSlots: { 'widget-custom': '<div>bare content</div>' },
			})
			await wrapper.vm.$nextTick()
			const item = wrapper.vm.bodyGridLayout[0]
			expect(wrapper.vm.showGridTitle(item)).toBe(true)
		})
	})

	describe('isDataWidget / isRelatedWidget dispatch', () => {
		it('classifies the seeded widgets by type', async () => {
			const wrapper = mountSchemaDriven()
			await wrapper.vm.$nextTick()
			const [dataItem, relatedItem] = wrapper.vm.bodyGridLayout
			expect(wrapper.vm.isDataWidget(dataItem)).toBe(true)
			expect(wrapper.vm.isRelatedWidget(dataItem)).toBe(false)
			expect(wrapper.vm.isRelatedWidget(relatedItem)).toBe(true)
			expect(wrapper.vm.isDataWidget(relatedItem)).toBe(false)
		})
	})

	describe('onBodyLayoutChange', () => {
		it('keeps the new geometry locally for the default body', async () => {
			const wrapper = mountSchemaDriven()
			await wrapper.vm.$nextTick()
			const moved = wrapper.vm.bodyGridLayout.map((l) => ({ ...l, gridWidth: 6 }))
			wrapper.vm.onBodyLayoutChange(moved)
			expect(wrapper.vm.autoBodyLayout.every((l) => l.gridWidth === 6)).toBe(true)
			expect(wrapper.emitted('layout-change')[0][0]).toBe(moved)
			expect(wrapper.emitted('update:layout')[0][0]).toBe(moved)
		})

		it('emits without mutating local state for an explicit layout prop', async () => {
			const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }]
			const widgets = [{ id: 'w1', type: 'stat', title: 'KPI' }]
			const wrapper = mount(CnDetailPage, { propsData: { layout, widgets } })
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.hasBodyGrid).toBe(true)
			const moved = [{ ...layout[0], gridX: 3 }]
			wrapper.vm.onBodyLayoutChange(moved)
			// Did not touch the materialized default arrays (explicit layout owns it)
			expect(wrapper.vm.autoBodyLayout).toBeNull()
			expect(wrapper.emitted('layout-change')[0][0]).toBe(moved)
		})
	})

	describe('widgetDisplayTitle (title-owning widget types)', () => {
		it('prefers content.title for a title-owning type (related) over the seed chrome title', async () => {
			// The related widget owns its title via content.title (its config
			// form edits it; the chrome title input is hidden). A non-empty seed
			// chrome title must NOT shadow the edited content.title — otherwise
			// the title can never be changed (the reported bug).
			const layout = [{ id: 1, widgetId: 'r1', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }]
			const widgets = [{ id: 'r1', type: 'related', title: 'Related', content: { title: 'Renamed', groups: [] } }]
			const wrapper = mount(CnDetailPage, { propsData: { layout, widgets } })
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.widgetDisplayTitle(layout[0])).toBe('Renamed')
			wrapper.destroy()
		})

		it('returns undefined for a title-owning widget with an empty content.title (widget default)', async () => {
			const layout = [{ id: 1, widgetId: 'r1', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }]
			const widgets = [{ id: 'r1', type: 'related', title: 'Related', content: { title: '', groups: [] } }]
			const wrapper = mount(CnDetailPage, { propsData: { layout, widgets } })
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.widgetDisplayTitle(layout[0])).toBeUndefined()
			wrapper.destroy()
		})

		it('keeps the chrome title authoritative for non-title-owning types', async () => {
			const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }]
			const widgets = [{ id: 'w1', type: 'stat', title: 'KPI', content: { title: 'ignored' } }]
			const wrapper = mount(CnDetailPage, { propsData: { layout, widgets } })
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.widgetDisplayTitle(layout[0])).toBe('KPI')
			wrapper.destroy()
		})
	})

	describe('configurable / removable default widgets', () => {
		it('resolves the config widget from the materialized auto-body', async () => {
			const wrapper = mountSchemaDriven()
			await wrapper.vm.$nextTick()
			wrapper.vm.configureWidget({ widgetId: 'data' })
			expect(wrapper.vm.configWidget).toBeTruthy()
			expect(wrapper.vm.configWidget.type).toBe('data')
		})

		it('removes a default widget from both the layout and widget arrays', async () => {
			const wrapper = mountSchemaDriven()
			await wrapper.vm.$nextTick()
			wrapper.vm.configureWidget({ widgetId: 'related' })
			wrapper.vm.onWidgetConfigDelete()
			expect(wrapper.vm.autoBodyLayout.map((l) => l.widgetId)).toEqual(['data'])
			expect(wrapper.vm.autoBodyWidgets.map((w) => w.id)).toEqual(['data'])
		})
	})
})
