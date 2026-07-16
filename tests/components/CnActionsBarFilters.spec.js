/**
 * Tests for CnActionsBar's `#filters` slot — inline filter controls (e.g.
 * CnQuickFilterBar) rendered INSIDE the action bar between the view toggle and
 * the add/actions, so a Decisions/Motions-style toggle lives in the main bar
 * rather than as a separate row below it.
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

describe('CnActionsBar — #filters slot', () => {
	it('renders #filters content inside the actions group', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectedIds: [], objectCount: 0, showViewToggle: true },
			stubs,
			slots: { filters: '<div class="my-filter-tabs">Decisions / Motions</div>' },
		})
		const filter = wrapper.find('.my-filter-tabs')
		expect(filter.exists()).toBe(true)
		// it lives within the right-hand actions group (the bar), not a separate row
		expect(filter.element.closest('.cn-actions-bar__actions')).not.toBeNull()
	})

	it('renders nothing for #filters when no slot is provided', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectedIds: [], objectCount: 0 },
			stubs,
		})
		expect(wrapper.find('.my-filter-tabs').exists()).toBe(false)
	})
})
