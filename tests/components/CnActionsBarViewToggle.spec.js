/**
 * Tests for CnActionsBar's unified view-mode toggle — cards / table / list
 * (via `availableViewModes`) plus an opt-in map segment (via `showMap`, the
 * beta back-compat bridge) — and the opt-in standalone sort dropdown.
 */

const { shallowMount } = require('@vue/test-utils')
const CnActionsBar = require('../../src/components/CnActionsBar/CnActionsBar.vue').default

describe('CnActionsBar — view toggle', () => {
	it('defaults to the two historical segments (cards, table)', () => {
		const wrapper = shallowMount(CnActionsBar, { propsData: { viewMode: 'cards' } })
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['cards', 'table'])
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(2)
	})

	it('lives in the LEFT info group (a visual control, grouped with search/filters)', () => {
		const wrapper = shallowMount(CnActionsBar, { propsData: { viewMode: 'cards' } })
		const toggle = wrapper.find('.cn-actions-bar__view-toggle')
		expect(toggle.element.closest('.cn-actions-bar__info')).not.toBeNull()
		expect(toggle.element.closest('.cn-actions-bar__actions')).toBeNull()
	})

	it('renders three segments in a custom availableViewModes order', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'list', availableViewModes: ['list', 'cards', 'table'] },
		})
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(3)
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['list', 'cards', 'table'])
	})

	it('renders a list segment when list is in availableViewModes', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'list', availableViewModes: ['cards', 'table', 'list'] },
		})
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(3)
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toContain('list')
	})

	it('appends a map segment via the showMap back-compat bridge', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'map', showMap: true },
		})
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['cards', 'table', 'map'])
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(3)
	})

	it('supports all four segments together (cards/table/list/map)', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'list', availableViewModes: ['cards', 'table', 'list'], showMap: true },
		})
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['cards', 'table', 'list', 'map'])
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(4)
	})

	it('emits view-mode-change with the clicked segment mode', async () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'cards', availableViewModes: ['cards', 'table', 'list'] },
		})
		await wrapper.findAll('.cn-actions-bar__view-toggle-btn').at(2).trigger('click')
		expect(wrapper.emitted('view-mode-change')[0]).toEqual(['list'])
	})

	it('positions the sliding thumb by active-segment index', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'table', availableViewModes: ['list', 'cards', 'table'] },
		})
		expect(wrapper.vm.thumbStyle.transform).toBe('translateX(200%)')
	})

	it('positions the sliding thumb on the map segment (index 3)', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'map', availableViewModes: ['cards', 'table', 'list'], showMap: true },
		})
		expect(wrapper.vm.thumbStyle.transform).toBe('translateX(300%)')
	})

	it('uses a custom mapLabel when provided', () => {
		const wrapper = shallowMount(CnActionsBar, {
			propsData: { viewMode: 'cards', showMap: true, mapLabel: 'Kaart' },
		})
		const mapSeg = wrapper.vm.viewSegments.find((s) => s.mode === 'map')
		expect(mapSeg.label).toBe('Kaart')
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
