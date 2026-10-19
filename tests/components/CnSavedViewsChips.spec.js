/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Saved views as chips with a count under the board look, and the quick-filter
 * tabs as pressed chips. The menu stays for managing views.
 *
 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-saved-views-are-chips-with-a-count
 */
import { mount } from '@vue/test-utils'
import CnQuickFilterBar from '../../src/components/CnQuickFilterBar/CnQuickFilterBar.vue'
import CnSavedViewsControl from '../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue'

const VIEWS = [
	{ id: '1', slug: 'all', name: 'All' },
	{ id: '2', slug: 'mine', name: 'My cases' },
	{ id: '3', slug: 'week', name: 'Due this week' },
]

function mountControl(props = {}, look = 'board') {
	return mount(CnSavedViewsControl, {
		props: { views: VIEWS, counts: { 1: 48, 2: 14 }, ...props },
		global: { provide: { cnLook: look }, stubs: { NcActions: { template: '<div class="actions" v-bind="$attrs"><slot name="icon" /></div>' }, NcActionButtonGroup: true } },
	})
}

describe('CnSavedViewsControl chips (board look)', () => {
	it('renders one chip per view with aria-pressed, the selected one marked', () => {
		const wrapper = mountControl({ selectedViewId: '1' })
		const chips = wrapper.findAll('[data-testid="cn-saved-views-chip"]')
		expect(chips).toHaveLength(3)
		const selected = chips.filter((c) => c.attributes('aria-pressed') === 'true')
		expect(selected.map((c) => c.attributes('data-view-id'))).toEqual(['1'])
		expect(selected[0].classes()).toContain('cn-saved-views__chip--selected')
	})

	it('shows the count badge only where there is a count', () => {
		const wrapper = mountControl()
		const chip = (id) => wrapper.find(`[data-testid="cn-saved-views-chip"][data-view-id="${id}"]`)
		expect(chip('1').find('[data-testid="cn-saved-views-chip-count"]').text()).toBe('48')
		expect(chip('2').find('[data-testid="cn-saved-views-chip-count"]').text()).toBe('14')
		expect(chip('3').find('[data-testid="cn-saved-views-chip-count"]').exists()).toBe(false)
	})

	it('applies a view when its chip is clicked', async () => {
		const wrapper = mountControl()
		await wrapper.find('[data-testid="cn-saved-views-chip"][data-view-id="2"]').trigger('click')
		expect(wrapper.emitted('apply')[0]).toEqual([VIEWS[1]])
	})

	it('keeps the menu, labelled "Save view", for managing views', () => {
		const wrapper = mountControl()
		const menu = wrapper.find('[data-testid="cn-saved-views-control"]')
		expect(menu.exists()).toBe(true)
		expect(menu.classes()).toContain('cn-saved-views__save')
	})

	it('is the menu alone without the look', () => {
		const wrapper = mountControl({}, 'nextcloud')
		expect(wrapper.find('[data-testid="cn-saved-views-chips"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-saved-views-control"]').classes()).not.toContain('cn-saved-views__save')
	})
})

describe('CnQuickFilterBar chips (board look)', () => {
	const tabs = [{ label: 'All', filter: {} }, { label: 'Open', filter: { status: 'open' } }]

	function mountBar(look) {
		return mount(CnQuickFilterBar, { props: { tabs, activeIndex: 0, inline: true }, global: { provide: { cnLook: look } } })
	}

	it('renders pressed buttons in a group, not a tablist', () => {
		const wrapper = mountBar('board')
		expect(wrapper.find('.cn-quick-filter-bar__tabs').attributes('role')).toBe('group')
		const buttons = wrapper.findAll('.cn-quick-filter-bar__tab')
		expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['true', 'false'])
		expect(buttons[0].attributes('role')).toBeUndefined()
	})

	it('keeps the tablist without the look', () => {
		const wrapper = mountBar('nextcloud')
		expect(wrapper.find('.cn-quick-filter-bar__tabs').attributes('role')).toBe('tablist')
		expect(wrapper.find('.cn-quick-filter-bar__tab').attributes('role')).toBe('tab')
	})
})
