import { mount } from '@vue/test-utils'
import CnContextMenu from '@/components/CnContextMenu/CnContextMenu.vue'

describe('CnContextMenu visible predicate', () => {
	it('filters actions by visible function against targetItem', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [
					{ label: 'Edit' },
					{ label: 'Publish', visible: (item) => !item.published },
					{ label: 'Depublish', visible: (item) => item.published },
				],
				targetItem: { published: true },
			},
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toEqual(['Edit', 'Depublish'])
	})

	it('flips when targetItem state differs', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [
					{ label: 'Publish', visible: (item) => !item.published },
					{ label: 'Depublish', visible: (item) => item.published },
				],
				targetItem: { published: false },
			},
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toEqual(['Publish'])
	})

	it('treats omitted visible as always shown (backwards compatible)', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [{ label: 'Plain' }],
				targetItem: { x: 1 },
			},
		})
		expect(wrapper.vm.visibleActions).toHaveLength(1)
	})

	it('respects boolean visible: false', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [
					{ label: 'Hidden', visible: false },
					{ label: 'Shown', visible: true },
				],
				targetItem: null,
			},
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toEqual(['Shown'])
	})
})

describe('CnContextMenu panels API', () => {
	it('renders the default NcActions path when activePanel is null', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: { open: true, actions: [{ label: 'Edit' }] },
		})
		// Default panel: no custom panel container in the DOM.
		expect(wrapper.find('[data-testid="cn-context-menu-panel"]').exists()).toBe(false)
	})

	it('renders the matching #panel:<name> slot when activePanel is set', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: { open: true, activePanel: 'colour', targetItem: { id: 7 } },
			scopedSlots: {
				'panel:colour': '<div class="colour-content">{{ props.targetItem.id }}</div>',
			},
		})
		const panel = wrapper.find('[data-testid="cn-context-menu-panel"]')
		expect(panel.exists()).toBe(true)
		expect(panel.attributes('data-panel')).toBe('colour')
		expect(panel.find('.colour-content').text()).toBe('7')
	})

	it('does not render the custom panel container when activePanel is set but menu is closed', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: { open: false, activePanel: 'colour' },
			scopedSlots: { 'panel:colour': '<div class="colour-content" />' },
		})
		expect(wrapper.find('[data-testid="cn-context-menu-panel"]').exists()).toBe(false)
	})

	it('passes back() to the panel slot and emits update:activePanel(null) when invoked', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: { open: true, activePanel: 'colour' },
			scopedSlots: {
				'panel:colour': '<button class="back" @click="props.back">Back</button>',
			},
		})
		wrapper.find('.back').trigger('click')
		expect(wrapper.emitted('update:activePanel')).toBeTruthy()
		expect(wrapper.emitted('update:activePanel')[0]).toEqual([null])
	})

	it('clicking the backdrop closes the menu and resets activePanel', async () => {
		const wrapper = mount(CnContextMenu, {
			propsData: { open: true, activePanel: 'colour' },
			scopedSlots: { 'panel:colour': '<div />' },
		})
		await wrapper.find('.cn-context-menu__backdrop').trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('update:activePanel')[0]).toEqual([null])
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('update:open')[0]).toEqual([false])
	})
})
