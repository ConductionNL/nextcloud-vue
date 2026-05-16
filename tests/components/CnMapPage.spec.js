/**
 * Tests for CnMapPage.
 *
 * Covers REQ-MMW-* of the manifest-map-widget spec — the `type:
 * "map"` page renderer. Forwards manifest-shape props onto
 * CnMapWidget, exposes header / filters / legend / popup slots, and
 * pass-throughs map-ready, marker-click, bounds-change, click events.
 */

import { mount } from '@vue/test-utils'
import CnMapPage from '@/components/CnMapPage/CnMapPage.vue'

const stubs = {
	CnPageHeader: {
		template: '<div class="cn-page-header-stub">{{ title }}</div>',
		props: ['title', 'description'],
	},
	CnMapWidget: {
		template: `
			<div class="cn-map-widget-stub">
				<slot name="legend" :layers="layers" :markers="markers" />
				<slot name="popup" :feature="{}" :properties="{}" />
				<slot name="fallback" />
			</div>
		`,
		props: ['center', 'zoom', 'layers', 'markers', 'clustering', 'height', 'autoFit', 'ariaLabel', 'unavailableLabel'],
	},
}

const mountPage = (propsData, opts = {}) => mount(CnMapPage, {
	propsData: {
		title: 'Case Map',
		center: [52.13, 5.29],
		zoom: 7,
		layers: [],
		markers: null,
		...propsData,
	},
	stubs,
	...opts,
})

describe('CnMapPage', () => {
	it('renders the page header from title prop', () => {
		const wrapper = mountPage()
		expect(wrapper.find('.cn-page-header-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-page-header-stub').text()).toContain('Case Map')
	})

	it('passes manifest-shape props through to CnMapWidget', () => {
		const wrapper = mountPage({
			center: [52.5, 5.7],
			zoom: 9,
			layers: [{ type: 'tile', url: 'https://x/{z}/{x}/{y}.png' }],
			markers: { features: [] },
			clustering: true,
			height: '600px',
			autoFit: false,
		})
		const widget = wrapper.findComponent({ name: 'CnMapWidget' })
		expect(widget.props('center')).toEqual([52.5, 5.7])
		expect(widget.props('zoom')).toBe(9)
		expect(widget.props('layers')).toEqual([{ type: 'tile', url: 'https://x/{z}/{x}/{y}.png' }])
		expect(widget.props('markers')).toEqual({ features: [] })
		expect(widget.props('clustering')).toBe(true)
		expect(widget.props('height')).toBe('600px')
		expect(widget.props('autoFit')).toBe(false)
	})

	it('renders the filters slot between header and map', () => {
		const wrapper = mount(CnMapPage, {
			propsData: { title: 'X', center: [0, 0] },
			stubs,
			slots: { filters: '<div class="my-filters">filter chrome</div>' },
		})
		const html = wrapper.html()
		const filterIdx = html.indexOf('my-filters')
		const widgetIdx = html.indexOf('cn-map-widget-stub')
		expect(filterIdx).toBeGreaterThan(-1)
		expect(widgetIdx).toBeGreaterThan(filterIdx)
	})

	it('passes the legend slot through to CnMapWidget', () => {
		const wrapper = mount(CnMapPage, {
			propsData: { title: 'X', center: [0, 0], layers: [{ type: 'tile', url: 'x' }] },
			stubs,
			scopedSlots: {
				legend: '<div class="my-legend">{{ props.layers.length }}</div>',
			},
		})
		expect(wrapper.find('.my-legend').exists()).toBe(true)
		expect(wrapper.find('.my-legend').text()).toBe('1')
	})

	it('overrides default header via #header slot', () => {
		const wrapper = mount(CnMapPage, {
			propsData: { title: 'X', center: [0, 0] },
			stubs,
			scopedSlots: { header: '<h1 class="my-header">{{ props.title }}</h1>' },
		})
		expect(wrapper.find('.my-header').exists()).toBe(true)
		expect(wrapper.find('.cn-page-header-stub').exists()).toBe(false)
	})

	it('forwards @marker-click from CnMapWidget', async () => {
		const wrapper = mountPage()
		const widget = wrapper.findComponent({ name: 'CnMapWidget' })
		widget.vm.$emit('marker-click', { feature: { id: 'a' }, latlng: { lat: 52, lng: 5 } })
		expect(wrapper.emitted('marker-click')).toBeTruthy()
		expect(wrapper.emitted('marker-click')[0][0]).toEqual({
			feature: { id: 'a' },
			latlng: { lat: 52, lng: 5 },
		})
	})

	it('forwards @map-ready / @bounds-change / @click from CnMapWidget', () => {
		const wrapper = mountPage()
		const widget = wrapper.findComponent({ name: 'CnMapWidget' })
		widget.vm.$emit('map-ready', { map: { _stub: true } })
		widget.vm.$emit('bounds-change', { north: 53, south: 51, east: 6, west: 4, zoom: 7 })
		widget.vm.$emit('click', { lat: 52, lng: 5 })
		expect(wrapper.emitted('map-ready')).toBeTruthy()
		expect(wrapper.emitted('bounds-change')).toBeTruthy()
		expect(wrapper.emitted('click')).toBeTruthy()
	})
})
