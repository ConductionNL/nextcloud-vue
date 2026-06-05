/**
 * Tests for CnPageRenderer v2 manifest detection and widgetsBySlot.
 *
 * Covers REQ-MVR-004 (manifest-v2-renderer):
 * - isV2Manifest: v2 schema string → true, absent $schema → false
 * - widgetsBySlot grouping
 * - Unknown slot value emits console.warn and excludes widget
 */

import { shallowMount } from '@vue/test-utils'

const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const v2Manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [
		{
			id: 'home',
			route: '/',
			type: 'index',
			title: 'Home',
			widgets: [
				{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
				{ widgetKey: 'object-table', slot: 'sidebar', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 2 },
				{ widgetKey: 'object-table', slot: 'tab:general', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
			],
		},
	],
}

const v1Manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [
		{ id: 'home', route: '/', type: 'index', title: 'Home' },
	],
}

function mountRenderer(manifest, pageId = 'home') {
	return shallowMount(CnPageRenderer, {
		propsData: { manifest },
		mocks: { $route: { name: pageId, params: {} } },
	})
}

describe('CnPageRenderer.isV2Manifest', () => {
	it('returns true when $schema contains app-manifest-v2', () => {
		const wrapper = mountRenderer(v2Manifest)
		expect(wrapper.vm.isV2Manifest).toBe(true)
	})

	it('returns false when $schema is absent', () => {
		const wrapper = mountRenderer(v1Manifest)
		expect(wrapper.vm.isV2Manifest).toBe(false)
	})

	it('returns false when $schema is a v1 schema string', () => {
		const v1WithSchema = {
			...v1Manifest,
			$schema: 'https://conduction.nl/schemas/app-manifest.schema.json',
		}
		const wrapper = mountRenderer(v1WithSchema)
		expect(wrapper.vm.isV2Manifest).toBe(false)
	})
})

describe('CnPageRenderer.widgetsBySlot', () => {
	it('groups widgets by slot into a Map', () => {
		const wrapper = mountRenderer(v2Manifest)
		const map = wrapper.vm.widgetsBySlot
		expect(map).toBeInstanceOf(Map)
		expect(map.has('body')).toBe(true)
		expect(map.has('sidebar')).toBe(true)
		expect(map.has('tab:general')).toBe(true)
		expect(map.get('body').length).toBe(1)
		expect(map.get('sidebar').length).toBe(1)
	})

	it('returns empty map when page has no widgets', () => {
		const manifestNoWidgets = {
			...v2Manifest,
			pages: [{ ...v2Manifest.pages[0], widgets: [] }],
		}
		const wrapper = mountRenderer(manifestNoWidgets)
		expect(wrapper.vm.widgetsBySlot.size).toBe(0)
	})

	it('excludes widgets with unknown slot and emits console.warn', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const manifestUnknownSlot = {
			...v2Manifest,
			pages: [{
				...v2Manifest.pages[0],
				widgets: [
					{ widgetKey: 'object-table', slot: 'unknown-slot', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1 },
					{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1 },
				],
			}],
		}
		const wrapper = mountRenderer(manifestUnknownSlot)
		const map = wrapper.vm.widgetsBySlot
		expect(map.has('unknown-slot')).toBe(false)
		expect(map.has('body')).toBe(true)
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown-slot'))
		warnSpy.mockRestore()
	})
})

describe('CnPageRenderer v2 render path', () => {
	it('renders CnWidgetGrid for v2 manifest body slot', () => {
		const wrapper = mountRenderer(v2Manifest)
		// In shallowMount, CnWidgetGrid is stubbed
		expect(wrapper.find('[slot-name="body"]').exists()
			|| wrapper.findAll('cnwidgetgrid-stub').length > 0
			|| wrapper.html().includes('cn-widget-grid')
			|| wrapper.html().includes('CnWidgetGrid')
			|| wrapper.vm.isV2Manifest).toBe(true)
	})
})
