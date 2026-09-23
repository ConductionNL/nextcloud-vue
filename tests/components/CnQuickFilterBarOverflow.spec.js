/**
 * Tests for CnQuickFilterBar's `maxVisible` overflow — the lenses past the cap
 * move behind one more CHIP instead of wrapping the bar onto a second line.
 */
import { mount } from '@vue/test-utils'
import CnQuickFilterBar from '../../src/components/CnQuickFilterBar/CnQuickFilterBar.vue'

const stubs = {
	NcPopover: { template: '<div class="nc-popover-stub"><slot name="trigger" /><slot /></div>' },
	NcSelect: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
	DotsHorizontal: { template: '<span class="dots-stub" />' },
}

const TABS = [
	{ label: 'All', filter: {} },
	{ label: 'Unread', filter: { unread: true } },
	{ label: 'Overdue', filter: { overdue: true } },
	{ label: 'Closed', filter: { closed: true } },
	{ label: 'Stuck', filter: { stuck: true } },
]

/**
 * @param {object} propsData Props to override on the mounted bar.
 * @return {object} The mounted wrapper.
 */
function mountBar(propsData = {}) {
	return mount(CnQuickFilterBar, {
		propsData: { tabs: TABS, activeIndex: 0, ...propsData },
		stubs,
	})
}

describe('CnQuickFilterBar — maxVisible overflow', () => {
	it('renders every tab as a pill and no overflow chip by default', () => {
		const wrapper = mountBar()
		expect(wrapper.findAll('.cn-quick-filter-bar__tab')).toHaveLength(5)
		expect(wrapper.find('[data-testid="cn-quick-filter-more"]').exists()).toBe(false)
	})

	it('caps the strip at maxVisible and puts the rest behind the overflow chip', () => {
		const wrapper = mountBar({ maxVisible: 3 })
		const pills = wrapper.find('.cn-quick-filter-bar__tabs').findAll('.cn-quick-filter-bar__tab')
		expect(pills).toHaveLength(3)
		expect(pills.at(2).text()).toContain('Overdue')

		const items = wrapper.findAll('[data-testid="cn-quick-filter-more-item"]')
		expect(items).toHaveLength(2)
		expect(items.at(0).text()).toContain('Closed')
		expect(items.at(1).text()).toContain('Stuck')
	})

	it('renders the overflow trigger as a chip, and its entries as chips too', () => {
		const wrapper = mountBar({ maxVisible: 3 })
		const trigger = wrapper.find('[data-testid="cn-quick-filter-more"]')
		expect(trigger.element.tagName).toBe('BUTTON')
		expect(trigger.classes()).toContain('cn-quick-filter-bar__tab')
		// Nothing hidden is active, so the chip is the bare glyph.
		expect(trigger.text()).toBe('')
		expect(trigger.find('.dots-stub').exists()).toBe(true)
		expect(trigger.classes()).toContain('cn-quick-filter-bar__more--icon-only')

		for (const item of wrapper.findAll('[data-testid="cn-quick-filter-more-item"]')) {
			expect(item.classes()).toContain('cn-quick-filter-bar__tab')
		}
	})

	it('keeps every tab visible when maxVisible is not exceeded', () => {
		const wrapper = mountBar({ maxVisible: 5 })
		expect(wrapper.findAll('.cn-quick-filter-bar__tab')).toHaveLength(5)
		expect(wrapper.find('[data-testid="cn-quick-filter-more"]').exists()).toBe(false)
	})

	it('emits the ORIGINAL tab index when a hidden chip is clicked', async () => {
		const wrapper = mountBar({ maxVisible: 3 })
		await wrapper.findAll('[data-testid="cn-quick-filter-more-item"]').at(1).trigger('click')
		expect(wrapper.emitted('update:active-index')).toEqual([[4]])
	})

	it('wears the active hidden tab as its own label and fill', () => {
		const wrapper = mountBar({ maxVisible: 3, activeIndex: 4 })
		const trigger = wrapper.find('[data-testid="cn-quick-filter-more"]')
		expect(trigger.text()).toBe('Stuck')
		expect(trigger.classes()).toContain('cn-quick-filter-bar__tab--active')
		expect(trigger.classes()).not.toContain('cn-quick-filter-bar__more--icon-only')

		const active = wrapper.findAll('[data-testid="cn-quick-filter-more-item"]')
			.filter((item) => item.classes().includes('cn-quick-filter-bar__tab--active'))
		expect(active).toHaveLength(1)
		expect(active[0].text()).toBe('Stuck')
	})

	it('stays the bare glyph when the active tab is a visible pill', () => {
		const wrapper = mountBar({ maxVisible: 3, activeIndex: 1 })
		const trigger = wrapper.find('[data-testid="cn-quick-filter-more"]')
		expect(trigger.text()).toBe('')
		expect(trigger.classes()).not.toContain('cn-quick-filter-bar__tab--active')
	})

	it('counts the hidden selection in multiple mode', () => {
		const wrapper = mountBar({ maxVisible: 3, multiple: true, selectedIndices: [1, 3, 4] })
		const trigger = wrapper.find('[data-testid="cn-quick-filter-more"]')
		expect(trigger.text()).toBe('2 filters')
		expect(trigger.classes()).toContain('cn-quick-filter-bar__tab--active')
	})

	it('toggles a hidden tab in multiple mode rather than replacing the selection', async () => {
		const wrapper = mountBar({ maxVisible: 3, multiple: true, selectedIndices: [1] })
		await wrapper.findAll('[data-testid="cn-quick-filter-more-item"]').at(0).trigger('click')
		expect(wrapper.emitted('update:selected-indices')).toEqual([[[1, 3]]])
	})

	it('closes the panel on a single-select pick and keeps it open on a toggle', async () => {
		const single = mountBar({ maxVisible: 3 })
		single.vm.moreOpen = true
		await single.findAll('[data-testid="cn-quick-filter-more-item"]').at(0).trigger('click')
		expect(single.vm.moreOpen).toBe(false)

		const multi = mountBar({ maxVisible: 3, multiple: true, selectedIndices: [] })
		multi.vm.moreOpen = true
		await multi.findAll('[data-testid="cn-quick-filter-more-item"]').at(0).trigger('click')
		expect(multi.vm.moreOpen).toBe(true)
	})

	it('ignores maxVisible in dropdown mode', () => {
		const wrapper = mountBar({ maxVisible: 2, mode: 'dropdown' })
		expect(wrapper.find('[data-testid="cn-quick-filter-more"]').exists()).toBe(false)
		expect(wrapper.find('.cn-quick-filter-bar--dropdown').exists()).toBe(true)
	})
})
