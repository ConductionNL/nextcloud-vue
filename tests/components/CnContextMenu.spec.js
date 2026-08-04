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

describe('CnContextMenu trigger accessibility', () => {
	it('marks the offscreen NcActions trigger inert (not aria-hidden)', () => {
		// The global @nextcloud/vue mock stubs NcActions without its trigger
		// button, so override it locally with one that renders the real
		// `.action-item__menutoggle` class CnContextMenu's mounted() hook targets.
		const wrapper = mount(CnContextMenu, {
			propsData: { actions: [{ label: 'Edit' }] },
			stubs: {
				NcActions: {
					name: 'NcActions',
					template: '<div><button class="action-item__menutoggle">…</button><slot /></div>',
				},
			},
		})
		const trigger = wrapper.element.querySelector('.action-item__menutoggle')
		expect(trigger).not.toBeNull()
		// `inert` hides it from AT *and* keeps focus-trap from restoring focus
		// onto a hidden element when the menu is dismissed without a click.
		expect(trigger.hasAttribute('inert')).toBe(true)
		expect(trigger.hasAttribute('aria-hidden')).toBe(false)
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

describe('CnContextMenu outside-click dismissal', () => {
	// Regression: @nextcloud/vue 9's NcActions sets
	// `noCloseOnClickOutside: this.manualOpen`, which zeroes NcPopover's own
	// autoHide. v8 only cleared the popper's `triggers`, so pressing off the
	// menu stopped closing it in the Vue 3 upgrade.
	const mountOpen = () => mount(CnContextMenu, {
		propsData: { open: true, actions: [{ label: 'Edit' }] },
		attachTo: document.body,
	})

	const pressOn = async (wrapper, node) => {
		node.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))
		await wrapper.vm.$nextTick()
	}

	it('closes when the press lands outside the menu', async () => {
		const wrapper = mountOpen()
		await wrapper.vm.$nextTick()

		const outside = document.createElement('div')
		document.body.appendChild(outside)
		await pressOn(wrapper, outside)

		expect(wrapper.vm.internalOpen).toBe(false)
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('update:open').at(-1)).toEqual([false])

		outside.remove()
		wrapper.unmount()
	})

	it('stays open for a press inside the popper NcActions teleports to body', async () => {
		const wrapper = mountOpen()
		await wrapper.vm.$nextTick()

		// The popper is not inside the component root, so containment has to be
		// resolved against the teleported element, not `$el`.
		const popper = document.createElement('div')
		popper.className = 'action-item__popper'
		document.body.appendChild(popper)
		await pressOn(wrapper, popper)

		expect(wrapper.vm.internalOpen).toBe(true)
		expect(wrapper.emitted('close')).toBeFalsy()

		popper.remove()
		wrapper.unmount()
	})

	it('stays open for a press inside a custom panel', async () => {
		const wrapper = mount(CnContextMenu, {
			propsData: { open: true, activePanel: 'filters' },
			slots: { 'panel:filters': '<div class="inner-panel-content">x</div>' },
			attachTo: document.body,
		})
		await wrapper.vm.$nextTick()

		await pressOn(wrapper, wrapper.find('.inner-panel-content').element)

		expect(wrapper.vm.internalOpen).toBe(true)
		expect(wrapper.emitted('close')).toBeFalsy()
		wrapper.unmount()
	})

	it('does not dismiss on the same gesture that opened it', async () => {
		// The listener is attached on nextTick precisely so the contextmenu /
		// click still propagating does not close the menu it just opened.
		const wrapper = mount(CnContextMenu, {
			propsData: { open: false, actions: [{ label: 'Edit' }] },
			attachTo: document.body,
		})
		await wrapper.setProps({ open: true })

		const outside = document.createElement('div')
		document.body.appendChild(outside)
		outside.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))

		expect(wrapper.vm.internalOpen).toBe(true)

		outside.remove()
		wrapper.unmount()
	})

	it('detaches the document listener once closed', async () => {
		const wrapper = mountOpen()
		await wrapper.vm.$nextTick()
		await wrapper.setProps({ open: false })
		await wrapper.vm.$nextTick()

		const spy = jest.spyOn(wrapper.vm, 'onClose')
		const outside = document.createElement('div')
		document.body.appendChild(outside)
		await pressOn(wrapper, outside)

		expect(spy).not.toHaveBeenCalled()
		outside.remove()
		wrapper.unmount()
	})
})
