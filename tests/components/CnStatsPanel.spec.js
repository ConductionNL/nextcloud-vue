import { mount } from '@vue/test-utils'
import CnStatsPanel from '@/components/CnStatsPanel/CnStatsPanel.vue'

const stubs = {
	NcLoadingIcon: true,
	NcListItem: {
		template: '<div class="nc-list-item"><slot name="icon" /><slot name="subname" /></div>',
		props: ['name', 'bold'],
	},
	CnStatsBlock: {
		template: '<div class="cn-stats-block"><slot name="icon" /></div>',
		props: ['title', 'count', 'countLabel', 'variant', 'icon', 'iconSize', 'horizontal', 'showZeroCount', 'breakdown', 'route', 'clickable', 'loading'],
	},
	CnKpiGrid: {
		template: '<div class="cn-kpi-grid"><slot /></div>',
		props: ['columns'],
	},
	CnIcon: {
		template: '<span class="cn-icon" />',
		props: ['name', 'size'],
	},
}

describe('CnStatsPanel', () => {
	it('renders empty when no sections provided', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: { sections: [] },
			stubs,
		})
		expect(wrapper.find('.cn-stats-panel').exists()).toBe(true)
		expect(wrapper.find('.cn-stats-panel__section').exists()).toBe(false)
	})

	it('renders stats section with stack layout', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'totals',
					title: 'System Totals',
					layout: 'stack',
					items: [
						{ title: 'Objects', count: 42, countLabel: 'objects', variant: 'primary' },
						{ title: 'Files', count: 10, countLabel: 'files' },
					],
				}],
			},
			stubs,
		})
		expect(wrapper.find('.cn-stats-panel__section-title').text()).toBe('System Totals')
		expect(wrapper.find('.cn-stats-panel__stack').exists()).toBe(true)
		expect(wrapper.findAll('.cn-stats-block').length).toBe(2)
		// Stack defaults: horizontal=true
		const blocks = wrapper.findAllComponents({ name: 'CnStatsBlock' })
		expect(blocks.at(0).props('horizontal')).toBe(true)
		expect(blocks.at(0).props('variant')).toBe('primary')
		expect(blocks.at(1).props('variant')).toBe('default')
	})

	it('renders stats section with grid layout', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'ops',
					title: 'Operations',
					layout: 'grid',
					columns: 2,
					items: [
						{ title: 'Create', count: 5, countLabel: 'ops', variant: 'success' },
						{ title: 'Delete', count: 2, countLabel: 'ops', variant: 'error' },
					],
				}],
			},
			stubs,
		})
		expect(wrapper.find('.cn-kpi-grid').exists()).toBe(true)
		const grid = wrapper.findComponent({ name: 'CnKpiGrid' })
		expect(grid.props('columns')).toBe(2)
		// Grid defaults: horizontal=false
		const blocks = wrapper.findAllComponents({ name: 'CnStatsBlock' })
		expect(blocks.at(0).props('horizontal')).toBe(false)
	})

	it('renders list section with NcListItems', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'list',
					id: 'topObjects',
					title: 'Most Active',
					items: [
						{ key: '1', name: 'Object A', subname: '42 entries' },
						{ key: '2', name: 'Object B', subname: '10 entries' },
					],
				}],
			},
			stubs,
		})
		expect(wrapper.find('.cn-stats-panel__list').exists()).toBe(true)
		expect(wrapper.findAll('.nc-list-item').length).toBe(2)
	})

	it('shows global loading state', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'totals',
					title: 'Totals',
					layout: 'stack',
					items: [{ title: 'X', count: 1, countLabel: 'x' }],
				}],
				loading: true,
				loadingLabel: 'Fetching data...',
			},
			stubs,
		})
		expect(wrapper.find('.cn-stats-panel__loading').exists()).toBe(true)
		expect(wrapper.find('.cn-stats-panel__loading').text()).toContain('Fetching data...')
		// Sections should not render
		expect(wrapper.find('.cn-stats-panel__section').exists()).toBe(false)
	})

	it('shows section-level loading state', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'totals',
					title: 'Totals',
					layout: 'stack',
					loading: true,
					items: [{ title: 'X', count: 1, countLabel: 'x' }],
				}],
			},
			stubs,
		})
		// Section renders but content is replaced by loading
		expect(wrapper.find('.cn-stats-panel__section').exists()).toBe(true)
		expect(wrapper.find('.cn-stats-panel__section .cn-stats-panel__loading').exists()).toBe(true)
		expect(wrapper.find('.cn-stats-panel__stack').exists()).toBe(false)
	})

	it('renders header slot', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: { sections: [] },
			stubs,
			slots: {
				header: '<div class="test-header">Filters</div>',
			},
		})
		expect(wrapper.find('.cn-stats-panel__header').exists()).toBe(true)
		expect(wrapper.find('.test-header').text()).toBe('Filters')
	})

	it('renders footer slot', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: { sections: [] },
			stubs,
			slots: {
				footer: '<div class="test-footer">Extra</div>',
			},
		})
		expect(wrapper.find('.cn-stats-panel__footer').exists()).toBe(true)
		expect(wrapper.find('.test-footer').text()).toBe('Extra')
	})

	it('emits stat-click when a stats block is clicked', async () => {
		const item = { title: 'Objects', count: 42, countLabel: 'objects', clickable: true }
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'totals',
					title: 'Totals',
					layout: 'stack',
					items: [item],
				}],
			},
			stubs: {
				...stubs,
				CnStatsBlock: {
					template: '<div class="cn-stats-block" @click="$emit(\'click\')"><slot name="icon" /></div>',
					props: ['title', 'count', 'countLabel', 'variant', 'icon', 'iconSize', 'horizontal', 'showZeroCount', 'breakdown', 'route', 'clickable', 'loading'],
				},
			},
		})
		await wrapper.find('.cn-stats-block').trigger('click')
		expect(wrapper.emitted('stat-click')).toBeTruthy()
		expect(wrapper.emitted('stat-click')[0][0].section).toBe('totals')
	})

	it('emits list-click when a list item is clicked', async () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'list',
					id: 'actions',
					title: 'Actions',
					items: [{ key: '1', name: 'create', subname: '10 entries' }],
				}],
			},
			stubs: {
				...stubs,
				NcListItem: {
					template: '<div class="nc-list-item" @click="$emit(\'click\')"><slot name="icon" /><slot name="subname" /></div>',
					props: ['name', 'bold'],
				},
			},
		})
		await wrapper.find('.nc-list-item').trigger('click')
		expect(wrapper.emitted('list-click')).toBeTruthy()
		expect(wrapper.emitted('list-click')[0][0].section).toBe('actions')
	})

	it('renders multiple sections in order', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [
					{ type: 'stats', id: 'a', title: 'Section A', layout: 'stack', items: [{ title: 'X', count: 1, countLabel: 'x' }] },
					{ type: 'list', id: 'b', title: 'Section B', items: [{ key: '1', name: 'Y', subname: 'z' }] },
					{ type: 'stats', id: 'c', title: 'Section C', layout: 'grid', columns: 2, items: [{ title: 'Z', count: 3, countLabel: 'z' }] },
				],
			},
			stubs,
		})
		const titles = wrapper.findAll('.cn-stats-panel__section-title')
		expect(titles.length).toBe(3)
		expect(titles.at(0).text()).toBe('Section A')
		expect(titles.at(1).text()).toBe('Section B')
		expect(titles.at(2).text()).toBe('Section C')
	})

	it('passes showZeroCount and breakdown to CnStatsBlock', () => {
		const breakdown = { size: '2.1 MB', invalid: 3 }
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'totals',
					layout: 'stack',
					items: [{ title: 'Objects', count: 0, countLabel: 'objects', showZeroCount: true, breakdown }],
				}],
			},
			stubs,
		})
		const block = wrapper.findComponent({ name: 'CnStatsBlock' })
		expect(block.props('showZeroCount')).toBe(true)
		expect(block.props('breakdown')).toEqual(breakdown)
	})

	it('shows default empty label when section has no items', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'list',
					id: 'empty',
					title: 'Action Distribution',
					items: [],
				}],
			},
			stubs,
		})
		expect(wrapper.find('.cn-stats-panel__empty').exists()).toBe(true)
		expect(wrapper.find('.cn-stats-panel__empty').text()).toBe('No data available')
		expect(wrapper.find('.cn-stats-panel__list').exists()).toBe(false)
	})

	it('shows custom empty label from section', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'list',
					id: 'empty',
					title: 'Top Objects',
					emptyLabel: 'No objects found',
					items: [],
				}],
			},
			stubs,
		})
		expect(wrapper.find('.cn-stats-panel__empty').text()).toBe('No objects found')
	})

	it('shows component-level empty label as fallback', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'empty',
					title: 'Stats',
					layout: 'stack',
					items: [],
				}],
				emptyLabel: 'Nothing to display',
			},
			stubs,
		})
		expect(wrapper.find('.cn-stats-panel__empty').text()).toBe('Nothing to display')
	})

	it('uses string icon via CnIcon in stats block', () => {
		const wrapper = mount(CnStatsPanel, {
			propsData: {
				sections: [{
					type: 'stats',
					id: 'totals',
					layout: 'stack',
					items: [{ title: 'Objects', count: 1, countLabel: 'objects', icon: 'DatabaseOutline' }],
				}],
			},
			stubs,
		})
		// String icon should render CnIcon inside the icon slot, not pass to :icon prop
		const block = wrapper.findComponent({ name: 'CnStatsBlock' })
		expect(block.props('icon')).toBeNull()
		expect(wrapper.find('.cn-icon').exists()).toBe(true)
	})
})
