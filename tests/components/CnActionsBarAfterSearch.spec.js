/**
 * Tests for CnActionsBar's `#after-search` slot — refinement controls (e.g. a
 * filter menu button) rendered beside the search field on the LEFT side of the
 * bar, so search + filters group as "narrow what you see" while the right
 * cluster stays "display + act".
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { template: '<button><slot /></button>', props: ['disabled', 'title'] },
	NcActionSeparator: { template: '<hr />' },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>', props: ['type', 'disabled'] },
	NcCheckboxRadioSwitch: { template: '<div><slot /></div>' },
	NcLoadingIcon: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
}

describe('CnActionsBar — #after-search slot', () => {
	it('renders #after-search content inside the info group, beside the search field', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectedIds: [], objectCount: 0, showSearch: true },
			stubs,
			slots: { 'after-search': '<button class="my-filter-button">Filter</button>' },
		})
		const filter = wrapper.find('.my-filter-button')
		expect(filter.exists()).toBe(true)
		// it lives within the LEFT info group (next to the search), not the
		// right-hand actions cluster
		expect(filter.element.closest('.cn-actions-bar__info')).not.toBeNull()
		expect(filter.element.closest('.cn-actions-bar__actions')).toBeNull()
		expect(wrapper.find('.cn-actions-bar__search').exists()).toBe(true)
	})

	it('renders the slot even without the search field (count mode)', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: {
				selectedIds: [],
				objectCount: 3,
				showSearch: false,
				pagination: { total: 3, page: 1, pages: 1, limit: 20 },
			},
			stubs,
			slots: { 'after-search': '<button class="my-filter-button">Filter</button>' },
		})
		expect(wrapper.find('.my-filter-button').exists()).toBe(true)
	})

	it('renders nothing extra when no slot is provided', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectedIds: [], objectCount: 0, showSearch: true },
			stubs,
		})
		expect(wrapper.find('.my-filter-button').exists()).toBe(false)
	})
})
