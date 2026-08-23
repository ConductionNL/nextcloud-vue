/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Deleting a widget from the in-place style editor must actually drop it from
 * the working manifest.
 *
 * Regression guard: removeWidget used to filter `widgets` / `layout` into NEW
 * arrays and emit those, never mutating. Since `@widget-remove` has no consumer
 * in the library or in Buildiq, the widget stayed on the page — Delete was a
 * silent no-op. Add (CnBuildiqEditButton.onAddWidgetSubmit) and Save
 * (onWidgetConfigSave) both mutate the manifest arrays in place; delete now
 * matches them.
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import '../../src/components/CnStatWidget/index.js'

function mountPage() {
	// The same array identities the working manifest would hold.
	const widgets = [
		{ id: 'kpi-a', type: 'stat', content: { label: 'A' } },
		{ id: 'kpi-b', type: 'stat', content: { label: 'B' } },
	]
	const layout = [
		{ id: 1, widgetId: 'kpi-a', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
		{ id: 2, widgetId: 'kpi-b', gridX: 3, gridY: 0, gridWidth: 3, gridHeight: 2 },
	]
	const wrapper = mount(CnDashboardPage, {
		propsData: { widgets, layout },
		stubs: { CnStatWidget: true, CnWidgetWrapper: true },
	})
	return { wrapper, widgets, layout }
}

describe('CnDashboardPage — removing a widget', () => {
	it('drops the widget from the manifest arrays in place', () => {
		const { wrapper, widgets, layout } = mountPage()

		wrapper.vm.removeWidget({ widgetId: 'kpi-a' })

		// The caller's arrays — i.e. the working manifest — are mutated.
		expect(widgets.map((w) => w.id)).toEqual(['kpi-b'])
		expect(layout.map((l) => l.widgetId)).toEqual(['kpi-b'])
	})

	it('still emits layout-change and widget-remove for consumers that persist', () => {
		const { wrapper } = mountPage()

		wrapper.vm.removeWidget({ widgetId: 'kpi-b' })

		expect(wrapper.emitted('layout-change')).toBeTruthy()
		const [removedId, remaining] = wrapper.emitted('widget-remove')[0]
		expect(removedId).toBe('kpi-b')
		expect(remaining.map((w) => w.id)).toEqual(['kpi-a'])
	})

	it('is a no-op for an unknown widget id', () => {
		const { wrapper, widgets, layout } = mountPage()

		wrapper.vm.removeWidget({ widgetId: 'does-not-exist' })

		expect(widgets).toHaveLength(2)
		expect(layout).toHaveLength(2)
	})

	it('deleting from the config editor routes through removeWidget and closes it', () => {
		const { wrapper, widgets } = mountPage()
		wrapper.vm.configWidgetId = 'kpi-a'
		wrapper.vm.showWidgetConfig = true

		wrapper.vm.onWidgetConfigDelete({ id: 'kpi-a' })

		expect(widgets.map((w) => w.id)).toEqual(['kpi-b'])
		expect(wrapper.vm.showWidgetConfig).toBe(false)
	})
})
