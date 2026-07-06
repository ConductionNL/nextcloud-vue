/**
 * Tests for CnActionsBar's view-mode toggle, including the opt-in third "Map"
 * segment (change: cnindexpage-map-viewmode). The two-segment (Cards / Table)
 * behaviour must stay unchanged when `showMap` is false.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { template: '<button><slot /></button>', props: ['disabled', 'title'] },
	NcActionSeparator: { template: '<hr />' },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>', props: ['type', 'disabled'] },
	NcLoadingIcon: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
}

/**
 * @param {object} propsData Component props.
 * @return {object} Vue Test Utils wrapper.
 */
function mountBar(propsData = {}) {
	return mount(CnActionsBar, {
		propsData: { selectedIds: [], objectCount: 0, showViewToggle: true, ...propsData },
		stubs,
	})
}

describe('CnActionsBar — view toggle', () => {
	it('renders exactly two segments and no --three class when showMap is false', () => {
		const wrapper = mountBar({ viewMode: 'table' })
		const buttons = wrapper.findAll('.cn-actions-bar__view-toggle-btn')
		expect(buttons.length).toBe(2)
		expect(wrapper.find('.cn-actions-bar__view-toggle--three').exists()).toBe(false)
	})

	it('keeps the two-segment thumb at --pos-1 for table (unchanged behaviour)', () => {
		const wrapper = mountBar({ viewMode: 'table' })
		const thumb = wrapper.find('.cn-actions-bar__view-toggle-thumb')
		expect(thumb.classes()).toContain('cn-actions-bar__view-toggle-thumb--pos-1')
		expect(thumb.classes()).not.toContain('cn-actions-bar__view-toggle-thumb--pos-2')
	})

	it('renders a third Map segment and the --three class when showMap is true', () => {
		const wrapper = mountBar({ viewMode: 'cards', showMap: true })
		const buttons = wrapper.findAll('.cn-actions-bar__view-toggle-btn')
		expect(buttons.length).toBe(3)
		expect(wrapper.find('.cn-actions-bar__view-toggle--three').exists()).toBe(true)
	})

	it('positions the thumb at --pos-2 when map is the active mode', () => {
		const wrapper = mountBar({ viewMode: 'map', showMap: true })
		const thumb = wrapper.find('.cn-actions-bar__view-toggle-thumb')
		expect(thumb.classes()).toContain('cn-actions-bar__view-toggle-thumb--pos-2')
	})

	it('emits view-mode-change("map") when the Map segment is clicked', async () => {
		const wrapper = mountBar({ viewMode: 'table', showMap: true })
		const mapBtn = wrapper.findAll('.cn-actions-bar__view-toggle-btn').at(2)
		await mapBtn.trigger('click')
		expect(wrapper.emitted('view-mode-change')).toBeTruthy()
		expect(wrapper.emitted('view-mode-change')[0]).toEqual(['map'])
	})

	it('uses a custom mapLabel when provided', () => {
		const wrapper = mountBar({ viewMode: 'table', showMap: true, mapLabel: 'Kaart' })
		const label = wrapper.findAll('.cn-actions-bar__view-toggle-label').at(2)
		expect(label.text()).toBe('Kaart')
	})
})
