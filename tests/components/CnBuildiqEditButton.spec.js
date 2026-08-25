/**
 * Tests for CnBuildiqEditButton (ADR-041).
 *
 * - hidden when available:false; renders the orange glyph when available:true
 * - Edit ⇄ Save toggle drives editor.enter()/editor.save() and emits @save
 * - Add widget only shows on dashboard pages; inert outside edit mode
 * - Edit menu / sidebar / actions / settings open their isolated modals
 * - Edit data opens the data editor WITHOUT entering manifest edit mode
 */

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnBuildiqEditButton from '../../src/components/CnBuildiqEditButton/CnBuildiqEditButton.vue'

const NcActionsStub = {
	name: 'NcActions',
	template: '<div class="nc-actions"><slot name="icon" /><slot /></div>',
}
const NcActionButtonStub = {
	name: 'NcActionButton',
	props: ['disabled'],
	template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
}

function makeEditor(editing = false, pages = []) {
	const editingRef = ref(editing)
	const workingRef = ref(editing ? { menu: [], pages } : null)
	return {
		editing: editingRef,
		working: workingRef,
		dirty: ref(false),
		enter: jest.fn(() => { editingRef.value = true; workingRef.value = { menu: [], pages } }),
		save: jest.fn().mockResolvedValue({ pages: [] }),
		cancel: jest.fn(() => { editingRef.value = false; workingRef.value = null }),
	}
}

function mountButton(props = {}) {
	return mount(CnBuildiqEditButton, {
		propsData: { available: true, editor: makeEditor(), ...props },
		stubs: {
			NcActions: NcActionsStub,
			NcActionButton: NcActionButtonStub,
			CnEditMenuModal: true,
			CnEditSidebarModal: true,
			CnEditDataModal: true,
		},
	})
}

/** Find an action button by (a substring of) its visible label. */
function btn(wrapper, label) {
	return wrapper.findAllComponents(NcActionButtonStub).find((b) => b.text().includes(label))
}

describe('CnBuildiqEditButton', () => {
	it('renders nothing when not available', () => {
		const wrapper = mountButton({ available: false })
		expect(wrapper.find('.cn-buildiq-edit').exists()).toBe(false)
	})

	it('renders the orange Buildiq glyph when available', () => {
		const wrapper = mountButton({ available: true })
		expect(wrapper.find('.cn-buildiq-edit').exists()).toBe(true)
		expect(wrapper.find('.cn-buildiq-edit__glyph').exists()).toBe(true)
	})

	it('enters edit mode on the toggle when not editing', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await btn(wrapper, 'Edit page').trigger('click')
		expect(editor.enter).toHaveBeenCalled()
	})

	it('saves and emits @save on the toggle when editing', async () => {
		const editor = makeEditor(true)
		const wrapper = mountButton({ editor })
		await btn(wrapper, 'Save page').trigger('click')
		await wrapper.vm.$nextTick()
		expect(editor.save).toHaveBeenCalled()
		expect(wrapper.emitted('save')).toBeTruthy()
	})

	it('shows a saving state while the async save is in flight, then clears it', async () => {
		let resolveSave
		const editor = makeEditor(true)
		editor.save = jest.fn(() => new Promise((resolve) => { resolveSave = resolve }))
		const wrapper = mountButton({ editor })
		btn(wrapper, 'Save page').trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.saving).toBe(true)
		resolveSave({ pages: [] })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.saving).toBe(false)
		expect(wrapper.vm.menuOpen).toBe(false)
	})

	it('hides Add widget on a non-dashboard page', () => {
		const wrapper = mountButton({ editor: makeEditor(true, [{ id: 'p', type: 'index' }]), pageId: 'p' })
		expect(btn(wrapper, 'Add widget')).toBeUndefined()
	})

	it('shows Add widget on a dashboard page and emits add-widget in edit mode', async () => {
		const wrapper = mountButton({ editor: makeEditor(true, [{ id: 'dash', type: 'dashboard' }]), pageId: 'dash' })
		const add = btn(wrapper, 'Add widget')
		expect(add).not.toBeUndefined()
		await add.trigger('click')
		expect(wrapper.emitted('add-widget')).toBeTruthy()
	})

	it('shows Add widget on a detail page too', () => {
		const wrapper = mountButton({ editor: makeEditor(true, [{ id: 'det', type: 'detail' }]), pageId: 'det' })
		expect(btn(wrapper, 'Add widget')).not.toBeUndefined()
	})

	it('hides Add widget on custom pages — custom is the bespoke-component escape hatch, not a widget canvas', () => {
		// Blank, component-backed, and (defensively) widget-carrying custom pages
		// all hide "Add widget": custom pages are not widget canvases. Widget
		// canvases are dashboard pages.
		const blank = mountButton({ editor: makeEditor(true, [{ id: 'blank', type: 'custom' }]), pageId: 'blank' })
		expect(blank.vm.pageSupportsWidgets).toBe(false)
		expect(btn(blank, 'Add widget')).toBeUndefined()

		const withComp = mountButton({ editor: makeEditor(true, [{ id: 'c', type: 'custom', component: 'MyPage' }]), pageId: 'c' })
		expect(btn(withComp, 'Add widget')).toBeUndefined()

		const withWidget = mountButton({ editor: makeEditor(true, [{ id: 'w', type: 'custom', widgets: [{ id: 'x', slot: 'body' }] }]), pageId: 'w' })
		expect(btn(withWidget, 'Add widget')).toBeUndefined()
	})

	it('ejects the default Data + Related grid into a detail page config on entering edit mode', () => {
		const page = { id: 'det', type: 'detail', config: { register: 'r', schema: 'dogs' } }
		const wrapper = mountButton({ editor: makeEditor(false, [page]), pageId: 'det' })
		// Enter edit mode via the Edit page toggle
		btn(wrapper, 'Edit page').trigger('click')
		const ejected = wrapper.vm.workingManifest.pages.find((p) => p.id === 'det')
		expect(ejected.config.widgets.map((w) => w.widgetId)).toEqual(['data', 'related'])
		expect(ejected.config.layout.map((l) => l.widgetId)).toEqual(['data', 'related'])
		// data widget carries the page's register/schema so its property editor resolves
		const dataDef = ejected.config.widgets.find((w) => w.widgetId === 'data')
		expect(dataDef.content).toMatchObject({ register: 'r', schema: 'dogs' })
	})

	it('appends an added widget into the detail page config grid', () => {
		const page = { id: 'det', type: 'detail', config: { register: 'r', schema: 'dogs', widgets: [], layout: [] } }
		const wrapper = mountButton({ editor: makeEditor(true, [page]), pageId: 'det' })
		wrapper.vm.onAddWidgetSubmit({ type: 'stat', content: { title: 'KPI' } })
		const cfg = wrapper.vm.workingManifest.pages.find((p) => p.id === 'det').config
		expect(cfg.widgets.some((w) => w.type === 'stat')).toBe(true)
		expect(cfg.layout.length).toBe(cfg.widgets.length)
	})

	it('opens the menu and sidebar editor modals', async () => {
		const wrapper = mountButton({ editor: makeEditor(true) })
		await btn(wrapper, 'Edit menu').trigger('click')
		expect(wrapper.emitted('edit-menu')).toBeTruthy()
		await btn(wrapper, 'Edit sidebar').trigger('click')
		expect(wrapper.emitted('edit-sidebar')).toBeTruthy()
	})

	it('auto-enters edit mode when opening the menu modal while not editing', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await btn(wrapper, 'Edit menu').trigger('click')
		expect(editor.enter).toHaveBeenCalled()
		expect(wrapper.emitted('edit-menu')).toBeTruthy()
	})

	it('exposes an Edit actions… item that opens the actions modal', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await btn(wrapper, 'Edit actions').trigger('click')
		expect(editor.enter).toHaveBeenCalled()
		expect(wrapper.emitted('edit-actions')).toBeTruthy()
	})

	it('exposes an Edit pages… item that auto-enters edit mode', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await btn(wrapper, 'Edit pages').trigger('click')
		expect(editor.enter).toHaveBeenCalled()
		expect(wrapper.emitted('edit-pages')).toBeTruthy()
	})

	// The four APP-LEVEL editors moved to the app detail page (buildiq#439,
	// buildiq#453). This menu is page-local now, so they are no longer listed
	// here — but the handlers stay callable on a ref, which is the contract a
	// consumer mounting its own surface depends on. Both halves are asserted:
	// gone from the menu, still reachable programmatically.
	it.each([
		['Edit settings', 'edit-settings', 'onEditSettings'],
		['Edit setup wizard', 'edit-setup', 'onEditSetup'],
		['Edit walkthrough', 'edit-walkthrough', 'onEditWalkthrough'],
		['Edit support', 'edit-support', 'onEditSupport'],
	])('%s is off the menu but still callable on a ref', async (label, event, handler) => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })

		expect(btn(wrapper, label)).toBeUndefined()

		await wrapper.vm[handler]()
		expect(editor.enter).toHaveBeenCalled()
		expect(wrapper.emitted(event)).toBeTruthy()
	})

	it('Edit data… opens the data editor WITHOUT entering manifest edit mode', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await btn(wrapper, 'Edit data').trigger('click')
		expect(editor.enter).not.toHaveBeenCalled()
		expect(wrapper.vm.showDataModal).toBe(true)
		expect(wrapper.emitted('edit-data')).toBeTruthy()
	})
})
