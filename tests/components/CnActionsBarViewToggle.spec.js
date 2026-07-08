/**
 * Tests for CnActionsBar's generalized view-mode toggle (Cards/Table/List)
 * and the opt-in standalone sort dropdown.
 */

const { shallowMount } = require('@vue/test-utils')
const CnActionsBar = require('../../src/components/CnActionsBar/CnActionsBar.vue').default

describe('CnActionsBar — view toggle', () => {
	it('defaults to the two historical segments (cards, table)', () => {
		const wrapper = shallowMount(CnActionsBar, { propsData: { viewMode: 'cards' } })
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['cards', 'table'])
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(2)
	})

	it('renders three segments when list is available', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'list', availableViewModes: ['list', 'cards', 'table'] },
		})
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(3)
	})

	it('emits view-mode-change with the clicked segment mode', async () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'list', availableViewModes: ['list', 'cards', 'table'] },
		})
		await wrapper.findAll('.cn-actions-bar__view-toggle-btn').at(1).trigger('click')
		expect(wrapper.emitted('view-mode-change')[0]).toEqual(['cards'])
	})

	it('positions the sliding thumb by active-segment index', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'table', availableViewModes: ['list', 'cards', 'table'] },
		})
		expect(wrapper.vm.thumbStyle.transform).toBe('translateX(200%)')
	})
})

describe('CnActionsBar — sort select', () => {
	const sortOptions = [{ value: 'name', label: 'Name' }, { value: 'url', label: 'URL' }]

	it('is hidden unless showSortSelect + options are provided', () => {
		const wrapper = shallowMount(CnActionsBar, { propsData: { sortOptions } })
		expect(wrapper.find('.cn-actions-bar__sort').exists()).toBe(false)
	})

	it('resolves the selected option object from sortValue', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { showSortSelect: true, sortOptions, sortValue: 'url' },
		})
		expect(wrapper.vm.selectedSortOption).toEqual({ value: 'url', label: 'URL' })
	})
})
