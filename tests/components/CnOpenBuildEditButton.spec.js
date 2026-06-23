/**
 * Tests for CnOpenBuildEditButton (ADR-041).
 *
 * - hidden when available:false; renders the orange glyph when available:true
 * - Edit ⇄ Save toggle drives editor.enter()/editor.save() and emits @save
 * - Add widget is inert outside edit mode, emits @add-widget in edit mode
 * - Edit menu / Edit sidebar open their isolated modals
 */

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnOpenBuildEditButton from '../../src/components/CnOpenBuildEditButton/CnOpenBuildEditButton.vue'

const NcActionsStub = {
	name: 'NcActions',
	template: '<div class="nc-actions"><slot name="icon" /><slot /></div>',
}
const NcActionButtonStub = {
	name: 'NcActionButton',
	props: ['disabled'],
	template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
}

function makeEditor(editing = false) {
	const editingRef = ref(editing)
	const workingRef = ref(editing ? { menu: [], pages: [] } : null)
	return {
		editing: editingRef,
		working: workingRef,
		dirty: ref(false),
		enter: jest.fn(() => { editingRef.value = true; workingRef.value = { menu: [], pages: [] } }),
		save: jest.fn().mockResolvedValue({ pages: [] }),
		cancel: jest.fn(() => { editingRef.value = false; workingRef.value = null }),
	}
}

function mountButton(props = {}) {
	return mount(CnOpenBuildEditButton, {
		propsData: { available: true, editor: makeEditor(), ...props },
		stubs: {
			NcActions: NcActionsStub,
			NcActionButton: NcActionButtonStub,
			CnEditMenuModal: true,
			CnEditSidebarModal: true,
		},
	})
}

describe('CnOpenBuildEditButton', () => {
	it('renders nothing when not available', () => {
		const wrapper = mountButton({ available: false })
		expect(wrapper.find('.cn-openbuild-edit').exists()).toBe(false)
	})

	it('renders the orange OpenBuild glyph when available', () => {
		const wrapper = mountButton({ available: true })
		expect(wrapper.find('.cn-openbuild-edit').exists()).toBe(true)
		expect(wrapper.find('.cn-openbuild-edit__glyph').exists()).toBe(true)
	})

	it('enters edit mode on the toggle when not editing', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await wrapper.findAllComponents(NcActionButtonStub).at(0).trigger('click')
		expect(editor.enter).toHaveBeenCalled()
	})

	it('saves and emits @save on the toggle when editing', async () => {
		const editor = makeEditor(true)
		const wrapper = mountButton({ editor })
		await wrapper.findAllComponents(NcActionButtonStub).at(0).trigger('click')
		await wrapper.vm.$nextTick()
		expect(editor.save).toHaveBeenCalled()
		expect(wrapper.emitted('save')).toBeTruthy()
	})

	it('shows a saving state while the async save is in flight, then clears it', async () => {
		let resolveSave
		const editor = makeEditor(true)
		editor.save = jest.fn(() => new Promise((resolve) => { resolveSave = resolve }))
		const wrapper = mountButton({ editor })
		wrapper.findAllComponents(NcActionButtonStub).at(0).trigger('click')
		await wrapper.vm.$nextTick()
		// Spinner is shown and the menu is held open while persisting.
		expect(wrapper.vm.saving).toBe(true)
		resolveSave({ pages: [] })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// Settled: spinner cleared and the menu closed.
		expect(wrapper.vm.saving).toBe(false)
		expect(wrapper.vm.menuOpen).toBe(false)
	})

	it('does not emit add-widget outside edit mode', async () => {
		const wrapper = mountButton({ editor: makeEditor(false) })
		// the Add-widget item is the 2nd action button
		await wrapper.findAllComponents(NcActionButtonStub).at(1).trigger('click')
		expect(wrapper.emitted('add-widget')).toBeFalsy()
	})

	it('emits add-widget in edit mode', async () => {
		const wrapper = mountButton({ editor: makeEditor(true) })
		await wrapper.findAllComponents(NcActionButtonStub).at(1).trigger('click')
		expect(wrapper.emitted('add-widget')).toBeTruthy()
	})

	it('opens the menu and sidebar editor modals', async () => {
		const wrapper = mountButton({ editor: makeEditor(true) })
		const buttons = wrapper.findAllComponents(NcActionButtonStub)
		// order: [toggle, add-widget, edit-pages, edit-menu, edit-sidebar, edit-actions, edit-settings, cancel]
		await buttons.at(3).trigger('click')
		expect(wrapper.emitted('edit-menu')).toBeTruthy()
		await buttons.at(4).trigger('click')
		expect(wrapper.emitted('edit-sidebar')).toBeTruthy()
	})

	it('auto-enters edit mode when opening the menu modal while not editing', async () => {
		const editor = makeEditor(false) // not editing → working is null
		const wrapper = mountButton({ editor })
		await wrapper.findAllComponents(NcActionButtonStub).at(3).trigger('click') // Edit menu…
		expect(editor.enter).toHaveBeenCalled() // working copy now populated for the modal
		expect(wrapper.emitted('edit-menu')).toBeTruthy()
	})

	it('exposes an Edit actions… item that opens the actions modal', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		// [toggle, add-widget, edit-pages, edit-menu, edit-sidebar, edit-actions, edit-settings]
		await wrapper.findAllComponents(NcActionButtonStub).at(5).trigger('click')
		expect(editor.enter).toHaveBeenCalled()
		expect(wrapper.emitted('edit-actions')).toBeTruthy()
	})

	it('exposes an Edit pages… item that auto-enters edit mode', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await wrapper.findAllComponents(NcActionButtonStub).at(2).trigger('click')
		expect(editor.enter).toHaveBeenCalled()
		expect(wrapper.emitted('edit-pages')).toBeTruthy()
	})

	it('exposes an Edit settings… item that auto-enters edit mode', async () => {
		const editor = makeEditor(false)
		const wrapper = mountButton({ editor })
		await wrapper.findAllComponents(NcActionButtonStub).at(6).trigger('click')
		expect(editor.enter).toHaveBeenCalled()
		expect(wrapper.emitted('edit-settings')).toBeTruthy()
	})
})
