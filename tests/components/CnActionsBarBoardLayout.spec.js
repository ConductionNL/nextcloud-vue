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
			props: { showBuildiqButton: false },
			global: { provide: { cnLook: 'board' }, stubs: { ...stubs, CnBuildiqEditButton: { template: '<i class="buildiq" />' } } },
		})
		expect(wrapper.find('.buildiq').exists()).toBe(false)
	})

	describe('DOM order equals the drawn order (WCAG 1.3.2, 2.4.3)', () => {
		const slots = {
			filters: '<button data-o="filters">chips</button>',
			'actions-end': '<button data-o="views">save view</button>',
			'after-search': '<button data-o="after-search">after</button>',
		}

		function order(look) {
			const w = mount(CnActionsBar, {
				props: { showSearch: true, showSidebarToggle: true, showViewToggle: true, viewMode: 'table', availableViewModes: ['table', 'cards'], showAdd: true, activeFilterChips: CHIPS },
				slots,
				global: { provide: { cnLook: look }, stubs },
			})
			const marks = {
				filters: '[data-o="filters"]',
				views: '[data-o="views"]',
				filter: '.cn-actions-bar__filter-button, [aria-label="Search and columns"]',
				switch: '.cn-actions-bar__view-toggle',
				add: '[data-testid="cn-cta-primary"]',
				search: '.cn-actions-bar__search',
				after: '[data-o="after-search"]',
				chip: '[data-testid="cn-actions-bar-filter-chip"]',
			}
			const root = w.find('.cn-actions-bar').element
			const all = [...root.querySelectorAll('*')]
			const pos = {}
			for (const [name, sel] of Object.entries(marks)) {
				const el = root.querySelector(sel)
				pos[name] = el ? all.indexOf(el) : -1
			}
			return pos
		}

		it('reads chips, saved views, Filter, view switch, the act cluster, then search and active filters under the board look', () => {
			const p = order('board')
			const seq = ['filters', 'views', 'filter', 'switch', 'add', 'search', 'after', 'chip']
			for (const name of seq) {
				expect(p[name]).toBeGreaterThan(-1)
			}
			const sorted = [...seq].sort((a, b) => p[a] - p[b])
			expect(sorted).toEqual(seq)
		})

		it('keeps the legacy order without the look: search and the view switch before the cluster', () => {
			const p = order('nextcloud')
			expect(p.search).toBeLessThan(p.switch)
			expect(p.switch).toBeLessThan(p.filters)
			expect(p.filters).toBeLessThan(p.add)
			expect(p.chip).toBe(-1)
		})
	})
})
