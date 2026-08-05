import { readFileSync } from 'fs'
import { join } from 'path'
import { mount } from '@vue/test-utils'
import CnContextMenu from '@/components/CnContextMenu/CnContextMenu.vue'
import { CTX_MENU_DATA_ATTR, CTX_MENU_POPPER_ATTR } from '@/composables/useContextMenu.js'

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

describe('CnContextMenu cursor-position scoping', () => {
	// Regression: the cursor-positioning transform was keyed on the `<html>`
	// data attribute alone, so it matched *every* `.v-popper__popper` on the
	// page — a table row's own actions menu opened at the last right-click
	// coordinates instead of under its button. The transform must be scoped to
	// the one popper this component owns.

	// The shared @nextcloud/vue mock stubs NcActions without a popover child,
	// so recreate just the ref chain `tagPopper()` walks.
	const mountWithPopper = (propsData = {}) => {
		const popper = document.createElement('div')
		popper.className = 'v-popper__popper'
		const NcPopoverStub = {
			name: 'NcPopover',
			template: '<div />',
			methods: {
				getPopoverContentElement: () => popper,
			},
		}
		const wrapper = mount(CnContextMenu, {
			propsData: { actions: [{ label: 'Edit' }], ...propsData },
			stubs: {
				NcActions: {
					name: 'NcActions',
					components: { NcPopoverStub },
					template: '<div><NcPopoverStub ref="popover" /><slot /></div>',
				},
			},
		})
		return { wrapper, popper }
	}

	it('stamps the marker on its own popper at mount', () => {
		const { wrapper, popper } = mountWithPopper()
		expect(popper.hasAttribute(CTX_MENU_POPPER_ATTR)).toBe(true)
		wrapper.unmount()
	})

	it('marks with an attribute, which survives floating-vue rewriting className', () => {
		// Regression: the marker was first shipped as a class. floating-vue binds
		// a dynamic `class` on the popper (`--shown` / `--hidden` / `--show-from`
		// / …) and Vue's patchClass assigns `el.className` wholesale, so the class
		// was wiped on the first open — the transform stopped matching and the
		// menu rendered at its offscreen trigger (≈ -9905px) instead of the
		// cursor. Simulate that patch and require the marker to outlive it.
		const { wrapper, popper } = mountWithPopper({ open: true })

		popper.className = 'v-popper__popper v-popper__popper--shown'

		expect(popper.hasAttribute(CTX_MENU_POPPER_ATTR)).toBe(true)
		expect(popper.matches(`.v-popper__popper[${CTX_MENU_POPPER_ATTR}]`)).toBe(true)
		wrapper.unmount()
	})

	it('leaves any other popper on the page untouched', () => {
		const foreign = document.createElement('div')
		foreign.className = 'v-popper__popper action-item__popper'
		document.body.appendChild(foreign)

		const { wrapper } = mountWithPopper({ open: true })

		expect(foreign.hasAttribute(CTX_MENU_POPPER_ATTR)).toBe(false)

		foreign.remove()
		wrapper.unmount()
	})

	it('drops the "menu is open" attribute when it closes', async () => {
		const { wrapper } = mountWithPopper({ open: true })
		// useContextMenu().open() sets this; simulate it so the watcher has
		// something to clear.
		document.documentElement.setAttribute(CTX_MENU_DATA_ATTR, '')

		await wrapper.setProps({ open: false })

		// NcActions' @closed never fires (upstream binds an event NcPopover does
		// not emit), so the close transition is the only place this can happen.
		expect(document.documentElement.hasAttribute(CTX_MENU_DATA_ATTR)).toBe(false)
		wrapper.unmount()
	})

	it('scopes the shared CSS to the marker attribute, not to the document attribute', () => {
		const css = readFileSync(join(__dirname, '../../src/css/context-menu.css'), 'utf8')
		const rules = css
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.split('}')
			.map((chunk) => chunk.split('{')[0].trim())
			.filter(Boolean)

		// Every popper-targeting rule must name the marker, or it applies to
		// unrelated popovers again.
		const popperRules = rules.filter((selector) => selector.includes('.v-popper__popper'))
		expect(popperRules.length).toBeGreaterThan(0)
		for (const selector of popperRules) {
			expect(selector).toContain(`[${CTX_MENU_POPPER_ATTR}]`)
		}
		// The destructive-action colour is shared with CnRowActions and must not
		// be gated on a context menu being open.
		expect(rules).toContain('.cn-row-action--destructive')
	})
})
