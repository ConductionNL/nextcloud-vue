/**
 * Tests for the built-in widget components and their registry entries.
 *
 * Covers REQ-MVR-006 through REQ-MVR-010 (manifest-v2-renderer):
 * - object-table: resolves to CnWidgetObjectTable; props forwarded to CnDataTable
 * - form-renderer: resolves; props forwarded
 * - map-viewer: resolves; props forwarded
 * - card-grid: resolves; renders CnObjectCard per object
 */

import { shallowMount } from '@vue/test-utils'

// We test the built-in registry directly
const { BUILT_IN_WIDGETS } = require('../../src/components/CnWidgetGrid/builtInWidgets.js')

describe('builtInWidgets registry', () => {
	it('registers object-table key', () => {
		expect(BUILT_IN_WIDGETS['object-table']).toBeDefined()
	})
	it('registers form-renderer key', () => {
		expect(BUILT_IN_WIDGETS['form-renderer']).toBeDefined()
	})
	it('registers map-viewer key', () => {
		expect(BUILT_IN_WIDGETS['map-viewer']).toBeDefined()
	})
	it('registers card-grid key', () => {
		expect(BUILT_IN_WIDGETS['card-grid']).toBeDefined()
	})

	it('object-table is CnWidgetObjectTable component', () => {
		const CnWidgetObjectTable = require('../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default
		expect(BUILT_IN_WIDGETS['object-table']).toBe(CnWidgetObjectTable)
	})
	it('form-renderer is CnWidgetFormRenderer component', () => {
		const CnWidgetFormRenderer = require('../../src/components/CnWidgetFormRenderer/CnWidgetFormRenderer.vue').default
		expect(BUILT_IN_WIDGETS['form-renderer']).toBe(CnWidgetFormRenderer)
	})
	it('map-viewer is CnWidgetMapViewer component', () => {
		const CnWidgetMapViewer = require('../../src/components/CnWidgetMapViewer/CnWidgetMapViewer.vue').default
		expect(BUILT_IN_WIDGETS['map-viewer']).toBe(CnWidgetMapViewer)
	})
	it('card-grid is CnWidgetCardGrid component', () => {
		const CnWidgetCardGrid = require('../../src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue').default
		expect(BUILT_IN_WIDGETS['card-grid']).toBe(CnWidgetCardGrid)
	})

	it('registers the Wave-1 keys: banner + audit-trail', () => {
		const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default
		const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default
		expect(BUILT_IN_WIDGETS.banner).toBe(CnBannerWidget)
		expect(BUILT_IN_WIDGETS['audit-trail']).toBe(CnAuditTrailWidget)
	})

	it('ports header / text / divider to the v2 grid (same content-only components as the dashboard catalog)', () => {
		const CnHeaderWidget = require('../../src/components/CnHeaderWidget/CnHeaderWidget.vue').default
		const CnTextWidget = require('../../src/components/CnTextWidget/CnTextWidget.vue').default
		const CnDividerWidget = require('../../src/components/CnDividerWidget/CnDividerWidget.vue').default
		expect(BUILT_IN_WIDGETS.header).toBe(CnHeaderWidget)
		expect(BUILT_IN_WIDGETS.text).toBe(CnTextWidget)
		expect(BUILT_IN_WIDGETS.divider).toBe(CnDividerWidget)
		// Identity with the dashboard registry renderers — one component, two surfaces.
		require('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
		const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		expect(getWidgetTypeEntry('header').renderer).toBe(CnHeaderWidget)
		expect(getWidgetTypeEntry('text').renderer).toBe(CnTextWidget)
		expect(getWidgetTypeEntry('divider').renderer).toBe(CnDividerWidget)
	})

	it('a v2 widgets[] entry with widgetKey "header" renders CnHeaderWidget content-only', () => {
		const CnWidgetGrid = require('../../src/components/CnWidgetGrid/CnWidgetGrid.vue').default
		const wrapper = shallowMount(CnWidgetGrid, {
			propsData: {
				slotName: 'body',
				widgets: [{
					widgetKey: 'header',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 12,
					gridHeight: 2,
					props: { content: { title: 'Welcome' } },
				}],
			},
		})
		const header = wrapper.findComponent({ name: 'CnHeaderWidget' })
		expect(header.exists()).toBe(true)
		expect(header.props('content')).toEqual({ title: 'Welcome' })
		// Content-only: no CnWidgetWrapper chrome around it.
		expect(wrapper.findComponent({ name: 'CnWidgetWrapper' }).exists()).toBe(false)
	})
})

describe('CnWidgetObjectTable', () => {
	it('forwards register and schema props to CnDataTable', () => {
		const CnWidgetObjectTable = require('../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { register: 'my-register', schema: 'my-schema', columns: ['id', 'name'] },
		})
		const dataTable = wrapper.findComponent({ name: 'CnDataTable' })
		expect(dataTable.exists()).toBe(true)
		expect(wrapper.props('register')).toBe('my-register')
		expect(wrapper.props('schema')).toBe('my-schema')
	})
})

describe('CnWidgetFormRenderer', () => {
	it('renders CnFormPage and forwards register/schema props', () => {
		const CnWidgetFormRenderer = require('../../src/components/CnWidgetFormRenderer/CnWidgetFormRenderer.vue').default
		const wrapper = shallowMount(CnWidgetFormRenderer, {
			propsData: { register: 'r1', schema: 's1' },
		})
		const formPage = wrapper.findComponent({ name: 'CnFormPage' })
		expect(formPage.exists()).toBe(true)
		expect(wrapper.props('register')).toBe('r1')
		expect(wrapper.props('schema')).toBe('s1')
	})
})

describe('CnWidgetMapViewer', () => {
	it('renders CnMapWidget', () => {
		const CnWidgetMapViewer = require('../../src/components/CnWidgetMapViewer/CnWidgetMapViewer.vue').default
		const wrapper = shallowMount(CnWidgetMapViewer, {
			propsData: { center: [52.0, 5.0], zoom: 7 },
		})
		const mapWidget = wrapper.findComponent({ name: 'CnMapWidget' })
		expect(mapWidget.exists()).toBe(true)
	})
})

describe('CnWidgetCardGrid', () => {
	it('renders one CnObjectCard per object', () => {
		const CnWidgetCardGrid = require('../../src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue').default
		const objects = [
			{ id: '1', title: 'Item 1' },
			{ id: '2', title: 'Item 2' },
			{ id: '3', title: 'Item 3' },
		]
		const wrapper = shallowMount(CnWidgetCardGrid, { propsData: { objects } })
		const cards = wrapper.findAllComponents({ name: 'CnObjectCard' })
		expect(cards.length).toBe(3)
	})

	it('renders nothing when objects is empty', () => {
		const CnWidgetCardGrid = require('../../src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue').default
		const wrapper = shallowMount(CnWidgetCardGrid, { propsData: { objects: [] } })
		const cards = wrapper.findAllComponents({ name: 'CnObjectCard' })
		expect(cards.length).toBe(0)
	})
})
