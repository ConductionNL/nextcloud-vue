/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look's toolbar: no band, a labelled Filter button with the count
 * of active filters, a search field that always renders, the active filters
 * as removable chips and a "Clear all" link.
 *
 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-toolbar-sits-on-the-ground-in-two-rows
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = { NcButton: { template: '<button type="button" v-bind="$attrs"><slot name="icon" /><slot /></button>' }, NcActions: true, CnBuildiqEditButton: true }

function mountBar(props = {}, look = 'board') {
	return mount(CnActionsBar, {
		props: { showSearch: true, showSidebarToggle: true, ...props },
		global: { provide: { cnLook: look }, stubs },
	})
}

const CHIPS = [{ key: 'team', label: 'Team: Woo' }, { key: 'status', label: 'Status: open' }]

describe('CnActionsBar board layout', () => {
	it('draws the board toolbar under the look and the legacy one without it', () => {
		expect(mountBar({}, 'board').find('.cn-actions-bar').classes()).toContain('cn-actions-bar--board')
		expect(mountBar({}, 'nextcloud').find('.cn-actions-bar').classes()).not.toContain('cn-actions-bar--board')
	})

	it('lets the layout prop win over the provided look', () => {
		expect(mountBar({ layout: 'nextcloud' }, 'board').find('.cn-actions-bar').classes()).not.toContain('cn-actions-bar--board')
		expect(mountBar({ layout: 'board' }, 'nextcloud').find('.cn-actions-bar').classes()).toContain('cn-actions-bar--board')
	})

	it('replaces the icon-only toggle with a labelled Filter button showing the active count', () => {
		const wrapper = mountBar({ activeFilterChips: CHIPS })
		const button = wrapper.find('[data-testid="cn-actions-bar-filter-button"]')
		expect(button.text()).toContain('Filter')
		expect(wrapper.find('[data-testid="cn-actions-bar-filter-badge"]').text()).toBe('2')
	})

	it('shows no badge and no "Active:" label without a filter, and still draws the search field', () => {
		const wrapper = mountBar()
		expect(wrapper.find('[data-testid="cn-actions-bar-filter-badge"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-actions-bar-active-label"]').exists()).toBe(false)
		expect(wrapper.find('.cn-actions-bar__search-input').exists()).toBe(true)
	})

	it('renders a chip per filter with a named remove button and a Clear all link', async () => {
		const wrapper = mountBar({ activeFilterChips: CHIPS })
		expect(wrapper.find('[data-testid="cn-actions-bar-active-label"]').text()).toBe('Active:')
		const chips = wrapper.findAll('[data-testid="cn-actions-bar-filter-chip"]')
		expect(chips).toHaveLength(2)
		const remove = chips[0].find('button')
		expect(remove.attributes('aria-label')).toBe('Remove filter: Team: Woo')
		await remove.trigger('click')
		expect(wrapper.emitted('remove-filter')[0]).toEqual([CHIPS[0]])
		await wrapper.find('[data-testid="cn-actions-bar-clear-all"]').trigger('click')
		expect(wrapper.emitted('clear-filters')).toHaveLength(1)
	})

	it('keeps the icon-only toggle and draws no chips without the look', () => {
		const wrapper = mountBar({ activeFilterChips: CHIPS }, 'nextcloud')
		expect(wrapper.find('[data-testid="cn-actions-bar-filter-button"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-actions-bar-filter-chip"]').exists()).toBe(false)
	})

	it('drops the buildiq square when the page took it into its header', () => {
		const wrapper = mount(CnActionsBar, {
			props: { showEditButton: false },
			global: { provide: { cnLook: 'board' }, stubs: { ...stubs, CnBuildiqEditButton: { template: '<i class="buildiq" />' } } },
		})
		expect(wrapper.find('.buildiq').exists()).toBe(false)
	})
})
