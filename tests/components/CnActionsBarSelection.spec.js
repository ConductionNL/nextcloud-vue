/**
 * Tests for CnActionsBar's contextual selection strip — appears while
 * `selectable` and a selection is active, carrying a live count
 * (role="status", WCAG 2.1 SC 4.1.3), the built-in selection-scoped mass
 * actions, the host's #selection-actions buttons, and a Clear control.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { template: '<button><slot /></button>', props: ['disabled', 'title'] },
	NcActionSeparator: { template: '<hr />' },
	NcButton: { template: '<button class="nc-button-stub" v-bind="$attrs"><slot /></button>', props: ['type', 'disabled'] },
	NcLoadingIcon: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
}

describe('CnActionsBar — contextual selection strip', () => {
	it('is hidden while nothing is selected', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectable: true, selectedIds: [], objectCount: 3 },
			stubs,
		})
		expect(wrapper.find('[data-testid="cn-selection-strip"]').exists()).toBe(false)
		// the live region exists but is empty, ready to announce
		expect(wrapper.find('[role="status"]').exists()).toBe(true)
		expect(wrapper.find('[role="status"]').text()).toBe('')
	})

	it('appears with a live count while a selection is active', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectable: true, selectedIds: ['a', 'b'], objectCount: 3 },
			stubs,
		})
		expect(wrapper.find('[data-testid="cn-selection-strip"]').exists()).toBe(true)
		expect(wrapper.find('[role="status"]').text()).toContain('2')
	})

	it('stays hidden when not selectable, whatever the ids say', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectable: false, selectedIds: ['a'], objectCount: 3 },
			stubs,
		})
		expect(wrapper.find('[data-testid="cn-selection-strip"]').exists()).toBe(false)
	})

	it('renders #selection-actions content inside the strip', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectable: true, selectedIds: ['a'], objectCount: 3 },
			stubs,
			slots: { 'selection-actions': '<button class="my-bulk-move">Move</button>' },
		})
		const btn = wrapper.find('.my-bulk-move')
		expect(btn.exists()).toBe(true)
		expect(btn.element.closest('[data-testid="cn-selection-strip"]')).not.toBeNull()
	})

	it('emits clear-selection from the strip Clear control', async () => {
		const wrapper = mount(CnActionsBar, {
			propsData: {
				selectable: true,
				selectedIds: ['a'],
				objectCount: 3,
				showMassCopy: false,
				showMassDelete: false,
			},
			stubs,
		})
		await wrapper
			.find('[data-testid="cn-selection-strip"] .cn-actions-bar__selection-clear')
			.trigger('click')
		expect(wrapper.emitted('clear-selection')).toBeTruthy()
	})

	it('shows the built-in Delete-selected button when that mass action is enabled', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: {
				selectable: true,
				selectedIds: ['a'],
				objectCount: 3,
				showMassCopy: false,
				showMassDelete: true,
			},
			stubs,
		})
		const strip = wrapper.find('[data-testid="cn-selection-strip"]')
		expect(strip.text()).toContain('Delete selected')
	})
})
