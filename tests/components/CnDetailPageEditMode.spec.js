/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { registerDashboardWidget } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

// Register a content-driven type and a detail-only (data) type for the tests.
registerDashboardWidget('test-stat', { renderer: {}, form: {}, defaultContent: {}, displayName: 's', icon: 'X' })
registerDashboardWidget('test-data', { renderer: {}, form: {}, defaultContent: {}, displayName: 'd', icon: 'X', surfaces: ['detail-page'] })

describe('CnDetailPage Buildiq edit mode', () => {
	const widgets = [
		{ id: 'kpi', title: 'KPI', type: 'test-stat', content: { label: 'Revenue' } },
		{ id: 'plain', title: 'Plain' }, // no type → no form, no renderer; still a cog
	]
	const layout = [
		{ id: 1, widgetId: 'kpi', gridX: 0, gridY: 0, gridWidth: 6 },
		{ id: 2, widgetId: 'plain', gridX: 6, gridY: 0, gridWidth: 6 },
	]

	const mount = (editing) => shallowMount(CnDetailPage, {
		propsData: { title: 'Detail', widgets: JSON.parse(JSON.stringify(widgets)), layout },
		provide: { cnEditingBody: editing },
		stubs: { CnWidgetStyleEditorModal: true },
	})

	it('unwraps the injected editing ref', () => {
		expect(mount(ref(true)).vm.editingBody).toBe(true)
		expect(mount(ref(false)).vm.editingBody).toBe(false)
		expect(mount(null).vm.editingBody).toBe(false)
	})

	it('shows the cog on every widget in edit mode, form or no form', () => {
		// A custom widget or an integration leaf has no registered form, and
		// used to get no cog: it could be dragged but never configured or
		// removed, because the delete lives in the cog's modal. The dashboard
		// page never gated the cog on a form; the detail page now agrees.
		const editing = mount(ref(true))
		expect(editing.vm.showsCog({ widgetId: 'kpi' })).toBe(true)
		expect(editing.vm.showsCog({ widgetId: 'plain' })).toBe(true)
		expect(editing.vm.showsCog({ widgetId: 'missing' })).toBe(false)
		const viewing = mount(ref(false))
		expect(viewing.vm.showsCog({ widgetId: 'kpi' })).toBe(false)
	})

	it('resolves a config form only for registered widget types', () => {
		const w = mount(ref(true))
		expect(w.vm.registryFormFor({ widgetId: 'kpi' })).toBeTruthy()
		expect(w.vm.registryFormFor({ widgetId: 'plain' })).toBeNull()
	})

	it('resolves a renderer for content-driven types but not for data/integration', () => {
		const w = mount(ref(true))
		expect(w.vm.registryRendererFor({ widgetId: 'kpi' })).toBeTruthy()
		expect(w.vm.registryRendererFor({ widgetId: 'plain' })).toBeNull()
		w.setProps({ widgets: [{ id: 'd', type: 'test-data' }], layout: [{ id: 1, widgetId: 'd', gridX: 0, gridY: 0, gridWidth: 6 }] })
		expect(w.vm.registryRendererFor({ widgetId: 'd' })).toBeNull()
	})

	it('persists edited content onto the widget def in place and emits', () => {
		const w = mount(ref(true))
		w.vm.configureWidget({ widgetId: 'kpi' })
		expect(w.vm.showWidgetConfig).toBe(true)
		expect(w.vm.configWidget.id).toBe('kpi')
		w.vm.onWidgetConfigSave({ title: 'New KPI', content: { label: 'Profit' } })
		const def = w.vm.widgets.find((x) => x.id === 'kpi')
		expect(def.title).toBe('New KPI')
		expect(def.content.label).toBe('Profit')
		expect(w.vm.showWidgetConfig).toBe(false)
		expect(w.emitted('widget-config-change')).toBeTruthy()
	})

	it('removes a widget def + its layout on delete', () => {
		const w = mount(ref(true))
		w.vm.configureWidget({ widgetId: 'kpi' })
		w.vm.onWidgetConfigDelete()
		expect(w.vm.widgets.find((x) => x.id === 'kpi')).toBeUndefined()
		expect(w.vm.layout.find((l) => l.widgetId === 'kpi')).toBeUndefined()
	})

	it('widgetContentFor returns the def content or empty object', () => {
		const w = mount(ref(true))
		expect(w.vm.widgetContentFor({ widgetId: 'kpi' })).toEqual({ label: 'Revenue' })
		expect(w.vm.widgetContentFor({ widgetId: 'plain' })).toEqual({})
	})

	it('identifies a type:data widget for schema-driven grid rendering', () => {
		const w = shallowMount(CnDetailPage, {
			propsData: {
				title: 'Detail',
				widgets: [{ id: 'main', title: 'Details', type: 'data', content: { columns: 2 } }, { id: 'kpi', type: 'test-stat' }],
				layout: [{ id: 1, widgetId: 'main', gridX: 0, gridY: 0, gridWidth: 12 }],
			},
			provide: { cnEditingBody: ref(false) },
			stubs: { CnWidgetStyleEditorModal: true },
		})
		expect(w.vm.isDataWidget({ widgetId: 'main' })).toBe(true)
		expect(w.vm.isDataWidget({ widgetId: 'kpi' })).toBe(false)
		// data is excluded from the generic registry-renderer fallback (it has its own branch)
		expect(w.vm.registryRendererFor({ widgetId: 'main' })).toBeNull()
	})
})
