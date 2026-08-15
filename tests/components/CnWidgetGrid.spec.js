/**
 * Tests for CnWidgetGrid component.
 *
 * Covers REQ-MVR-004 and REQ-MVR-005 (manifest-v2-renderer):
 * - slot → gridColumns mapping for all 7 slot patterns
 * - gridWidth clamping + warning
 * - unknown widgetKey warning + skip
 * - custom registry override of built-in
 */

import { shallowMount } from '@vue/test-utils'
import { toRaw } from 'vue'
import CnWidgetGrid from '../../src/components/CnWidgetGrid/CnWidgetGrid.vue'
import { BUILT_IN_WIDGETS } from '../../src/components/CnWidgetGrid/builtInWidgets.js'

// Mock the built-in widget components so they don't need their own deps
jest.mock('../../src/components/CnWidgetGrid/builtInWidgets.js', () => ({
	BUILT_IN_WIDGETS: {
		'object-table': { template: '<div class="widget-table" />', name: 'CnWidgetObjectTable' },
		'form-renderer': { template: '<div class="widget-form" />', name: 'CnWidgetFormRenderer' },
		'map-viewer': { template: '<div class="widget-map" />', name: 'CnWidgetMapViewer' },
		'card-grid': { template: '<div class="widget-cards" />', name: 'CnWidgetCardGrid' },
	},
}))

function mount(slotName, widgets, registry = {}) {
	return shallowMount(CnWidgetGrid, {
		propsData: { slotName, widgets, registry },
	})
}

describe('CnWidgetGrid — gridColumns per slot', () => {
	const cases = [
		['body', 12],
		['sidebar', 1],
		['header-actions', 12],
		['footer', 12],
		['modal', 12],
		['tab:general', 12],
		['section:overview', 12],
	]

	cases.forEach(([slotName, expectedColumns]) => {
		it(`slot "${slotName}" → ${expectedColumns} columns`, () => {
			const wrapper = mount(slotName, [])
			expect(wrapper.vm.gridColumns).toBe(expectedColumns)
		})
	})

	it('unknown slot defaults to 12 columns', () => {
		const wrapper = mount('unknown-slot', [])
		expect(wrapper.vm.gridColumns).toBe(12)
	})
})

describe('CnWidgetGrid — gridWidth clamping', () => {
	it('clamps gridWidth to gridColumns when exceeded and emits console.warn', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mount('sidebar', [
			{ widgetKey: 'object-table', slot: 'sidebar', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 1 },
		])
		const resolved = wrapper.vm.resolvedWidgets
		expect(resolved.length).toBe(1)
		expect(resolved[0].gridWidth).toBe(1) // clamped to 1 for sidebar
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('gridWidth'))
		warnSpy.mockRestore()
	})

	it('does NOT clamp when gridWidth is within bounds', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mount('body', [
			{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 },
		])
		expect(wrapper.vm.resolvedWidgets[0].gridWidth).toBe(6)
		expect(warnSpy).not.toHaveBeenCalled()
		warnSpy.mockRestore()
	})
})

describe('CnWidgetGrid — unknown widgetKey', () => {
	it('renders a visible placeholder (not a silent skip) and warns for an unknown widgetKey', () => {
		// 2026-07-06 audit item 12: an unknown widgetKey used to be dropped
		// silently, so a page whose widgets all failed to resolve rendered a
		// blank pane (petstore dashboard). It now resolves to the CnUnknownWidget
		// placeholder so the failure is visible, while still warning for devs.
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mount('body', [
			{ widgetKey: 'does-not-exist', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		])
		expect(wrapper.vm.resolvedWidgets.length).toBe(1)
		expect(wrapper.vm.resolvedWidgets[0].widgetKey).toBe('does-not-exist')
		expect(wrapper.vm.resolvedWidgets[0].component.name).toBe('CnUnknownWidget')
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('does-not-exist'))
		warnSpy.mockRestore()
	})
})

describe('CnWidgetGrid — custom registry override', () => {
	it('resolves built-in widgetKey', () => {
		const wrapper = mount('body', [
			{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		])
		expect(wrapper.vm.resolvedWidgets.length).toBe(1)
		expect(wrapper.vm.resolvedWidgets[0].component).toBe(BUILT_IN_WIDGETS['object-table'])
	})

	it('custom registry entry overrides built-in', () => {
		const CustomTable = { template: '<div class="custom-table" />', name: 'CustomTable' }
		const wrapper = mount('body', [
			{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		], { 'object-table': { component: CustomTable, kind: 'widget' } })
		// `toRaw` on the received side: the resolved list is computed from
		// reactive state, so the component definition comes back wrapped.
		// Identity is the point — the custom entry must win over the built-in.
		expect(toRaw(wrapper.vm.resolvedWidgets[0].component)).toBe(CustomTable)
	})
})

describe('CnWidgetGrid — dataSource forwarding', () => {
	it('forwards the widget top-level dataSource as a dataSource prop', () => {
		const ds = { register: 'reg', schema: 'thing', aggregate: 'count' }
		const wrapper = mount('body', [
			{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1, dataSource: ds },
		])
		expect(wrapper.vm.resolvedWidgets[0].props.dataSource).toEqual(ds)
	})

	it('keeps nested props.dataSource working (back-compat) and lets it win on collision', () => {
		const top = { register: 'top', schema: 'thing', aggregate: 'count' }
		const nested = { register: 'nested', schema: 'thing', aggregate: 'count' }
		const wrapper = mount('body', [
			{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1, dataSource: top, props: { dataSource: nested } },
		])
		// props.dataSource (app-side workaround) is spread last → wins.
		expect(wrapper.vm.resolvedWidgets[0].props.dataSource).toEqual(nested)
	})

	it('omits dataSource prop entirely when the widget has none', () => {
		const wrapper = mount('body', [
			{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		])
		expect('dataSource' in wrapper.vm.resolvedWidgets[0].props).toBe(false)
	})
})

describe('CnWidgetGrid — shared grid engine cell vars', () => {
	it('emits the responsive grid CSS custom properties', () => {
		const wrapper = mount('body', [])
		// The shared engine emits CSS vars (read by .cn-grid in grid.css)
		// rather than a fixed grid-column/grid-row, so the grid can collapse
		// responsively (12 → 6 → 1) without per-item media queries.
		const style = wrapper.vm.cnGridCellStyle({ gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }, 12)
		expect(style['--cn-grid-cs']).toBe(1)
		expect(style['--cn-grid-cspan']).toBe(6)
		expect(style['--cn-grid-cspan-md']).toBe(6)
		expect(style['--cn-grid-rs']).toBe(1)
		expect(style['--cn-grid-rspan']).toBe(2)
	})

	it('clamps a wide span to 6 columns at the medium breakpoint', () => {
		const wrapper = mount('body', [])
		const style = wrapper.vm.cnGridCellStyle({ gridX: 0, gridWidth: 8 }, 12)
		expect(style['--cn-grid-cspan']).toBe(8)
		expect(style['--cn-grid-cspan-md']).toBe(6)
	})
})
