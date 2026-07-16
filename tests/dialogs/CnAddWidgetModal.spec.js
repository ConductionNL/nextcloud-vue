/**
 * Tests for CnAddWidgetModal (cn-widget-library, Wave 0).
 *
 * Covers the type picker (shows registered form-bearing types), the validation
 * gate (disabled submit + first-error title), the preselect/edit lifecycle
 * (picker hidden, content pre-filled, relabelled), type-switch content reset,
 * and the non-destructive close (cancel/Esc never submit).
 *
 * NcModal / NcButton are stubbed via tests/__mocks__/nextcloud-vue.js. The
 * registry is loaded in an isolated module graph per test so the modal binds
 * to a fresh, test-seeded registry.
 */

import { mount } from '@vue/test-utils'

/**
 * A factory for a fake sub-form component whose `validate()` / `assembledContent`
 * are configurable, so the modal's gate and assembly can be exercised.
 *
 * @param {object} opts options.
 * @param {string[]} [opts.errors] the array `validate()` returns.
 * @param {object} [opts.assembled] the `assembledContent` getter value.
 * @return {object} a Vue component definition.
 */
function fakeForm({ errors = [], assembled = null } = {}) {
	return {
		name: 'FakeForm',
		props: { editingWidget: { default: null }, value: { default: () => ({}) } },
		render(h) {
			return h('div', { class: 'fake-form' })
		},
		methods: {
			validate() {
				return errors
			},
		},
		computed: {
			assembledContent() {
				return assembled === null ? undefined : assembled
			},
		},
	}
}

/**
 * Load CnAddWidgetModal with a fresh registry and seed it with the given
 * entries, returning the modal component plus the registry exports.
 *
 * @param {Record<string, object>} entries map of type → partial registry entry.
 * @return {{CnAddWidgetModal: object, registry: object}} the wired exports.
 */
function loadModal(entries = {}) {
	let CnAddWidgetModal
	let registry
	jest.isolateModules(() => {
		registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		CnAddWidgetModal = require('../../src/dialogs/CnAddWidgetModal.vue').default
	})
	for (const [type, entry] of Object.entries(entries)) {
		registry.registerDashboardWidget(type, {
			renderer: { name: 'R' },
			form: entry.form !== undefined ? entry.form : fakeForm(),
			defaultContent: entry.defaultContent || {},
			displayName: entry.displayName || type,
			icon: entry.icon || 'Star',
		})
	}
	return { CnAddWidgetModal, registry }
}

describe('CnAddWidgetModal', () => {
	it('create mode shows the picker listing only form-bearing types', () => {
		const { CnAddWidgetModal } = loadModal({
			label: { displayName: 'Label' },
			text: { displayName: 'Text' },
			'renderer-only': { form: null, displayName: 'RendererOnly' },
		})
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		const select = wrapper.find('[data-testid="widget-type-select"]')
		expect(select.exists()).toBe(true)
		const options = wrapper.findAll('option')
		const values = options.wrappers.map((o) => o.attributes('value'))
		expect(values).toEqual(['label', 'text'])
		expect(values).not.toContain('renderer-only')
	})

	it('hides the chrome title controls when the active type owns its title', async () => {
		// Use the real (non-isolated) registry + modal so the modal's imported
		// getWidgetTypeEntry and the registration below share one instance.
		const registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		const Modal = require('../../src/dialogs/CnAddWidgetModal.vue').default
		registry.registerDashboardWidget('owns-title-test', {
			renderer: { name: 'R' }, form: fakeForm(), defaultContent: {}, displayName: 'Owns title', icon: 'Star', ownsTitle: true,
		})
		registry.registerDashboardWidget('plain-title-test', {
			renderer: { name: 'R' }, form: fakeForm(), defaultContent: {}, displayName: 'Plain', icon: 'Star',
		})
		const wrapper = mount(Modal, { propsData: { show: true } })
		wrapper.vm.state.type = 'owns-title-test'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.activeTypeOwnsTitle).toBe(true)
		wrapper.vm.state.type = 'plain-title-test'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.activeTypeOwnsTitle).toBe(false)
	})

	it('mounts the first available type\'s sub-form on open', () => {
		const { CnAddWidgetModal } = loadModal({ label: { displayName: 'Label' } })
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		expect(wrapper.find('.fake-form').exists()).toBe(true)
		expect(wrapper.vm.state.type).toBe('label')
	})

	it('offers a detail-only type only when surface="detail-page"', () => {
		const { CnAddWidgetModal, registry } = loadModal({ label: { displayName: 'Label' } })
		// A detail-only type (mirrors the real `data` widget).
		registry.registerDashboardWidget('data', {
			renderer: { name: 'R' }, form: fakeForm(), defaultContent: {}, displayName: 'Object data', icon: 'Star', surfaces: ['detail-page'],
		})
		// Default (dashboard) surface excludes it.
		const dash = mount(CnAddWidgetModal, { propsData: { show: true } })
		expect(dash.findAll('option').wrappers.map((o) => o.attributes('value'))).not.toContain('data')
		// Detail surface includes it (alongside the universal type).
		const detail = mount(CnAddWidgetModal, { propsData: { show: true, surface: 'detail-page' } })
		const values = detail.findAll('option').wrappers.map((o) => o.attributes('value'))
		expect(values).toContain('data')
		expect(values).toContain('label')
	})

	it('disables submit while the sub-form is invalid and shows the first error', async () => {
		const { CnAddWidgetModal } = loadModal({
			label: { form: fakeForm({ errors: ['Label is required'] }) },
		})
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isValid).toBe(false)
		expect(wrapper.vm.firstError).toBe('Label is required')
		const saveBtn = wrapper.find('[data-testid="add-widget-save"]')
		expect(saveBtn.attributes('disabled')).toBeDefined()
	})

	it('hides the __no-active-form__ sentinel from firstError', async () => {
		const { CnAddWidgetModal } = loadModal({})
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		await wrapper.vm.$nextTick()
		// no types → no active form → sentinel, but firstError stays empty
		expect(wrapper.vm.isValid).toBe(false)
		expect(wrapper.vm.firstError).toBe('')
		expect(wrapper.find('.cn-add-widget-modal__empty').exists()).toBe(true)
	})

	it('enables submit and emits the assembled payload when valid', async () => {
		const { CnAddWidgetModal } = loadModal({
			label: { form: fakeForm({ errors: [], assembled: { text: 'hi' } }) },
		})
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isValid).toBe(true)
		wrapper.find('[data-testid="add-widget-save"]').trigger('click')
		expect(wrapper.emitted('submit')).toBeTruthy()
		expect(wrapper.emitted('submit')[0][0]).toEqual({
			type: 'label',
			content: { text: 'hi' },
			chrome: { showTitle: true, customTitle: '', customIcon: '', backgroundColor: '' },
		})
	})

	it('carries the edited Appearance chrome in the submit payload', async () => {
		const { CnAddWidgetModal } = loadModal({
			label: { form: fakeForm({ errors: [], assembled: { text: 'hi' } }) },
		})
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		await wrapper.vm.$nextTick()
		// edit the chrome as the user would via the Appearance controls
		wrapper.vm.chrome.showTitle = true
		wrapper.vm.chrome.customTitle = 'My widget'
		wrapper.vm.chrome.customIcon = 'icon-star'
		wrapper.vm.chrome.backgroundColor = '#ff0000'
		wrapper.find('[data-testid="add-widget-save"]').trigger('click')
		expect(wrapper.emitted('submit')[0][0].chrome).toEqual({
			showTitle: true,
			customTitle: 'My widget',
			customIcon: 'icon-star',
			backgroundColor: '#ff0000',
		})
	})

	it('seeds the chrome from an edited placement (round-trip)', async () => {
		const { CnAddWidgetModal } = loadModal({
			label: { form: fakeForm({ errors: [], assembled: { text: 'hi' } }) },
		})
		const editingWidget = { type: 'label', content: { text: 'hi' }, showTitle: 0, customTitle: 'Seeded', customIcon: 'icon-files', styleConfig: { backgroundColor: '#00ff00' } }
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true, editingWidget } })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.chrome).toEqual({
			showTitle: false,
			customTitle: 'Seeded',
			customIcon: 'icon-files',
			backgroundColor: '#00ff00',
		})
	})

	it('preselectedType hides the picker and opens directly on that type', () => {
		const { CnAddWidgetModal } = loadModal({
			label: { displayName: 'Label' },
			tile: { displayName: 'Tile' },
		})
		const wrapper = mount(CnAddWidgetModal, {
			propsData: { show: true, preselectedType: 'tile' },
		})
		expect(wrapper.find('[data-testid="widget-type-select"]').exists()).toBe(false)
		expect(wrapper.vm.state.type).toBe('tile')
	})

	it('edit mode hides the picker, pre-fills content, and relabels', () => {
		const { CnAddWidgetModal } = loadModal({
			header: { defaultContent: { title: '', subtitle: '' }, displayName: 'Header' },
		})
		const wrapper = mount(CnAddWidgetModal, {
			propsData: {
				show: true,
				editingWidget: { type: 'header', content: { title: 'Hello' } },
			},
		})
		expect(wrapper.find('[data-testid="widget-type-select"]').exists()).toBe(false)
		expect(wrapper.vm.state.type).toBe('header')
		// merged: persisted title over defaults, subtitle keeps default
		expect(wrapper.vm.state.content).toEqual({ title: 'Hello', subtitle: '' })
		expect(wrapper.vm.modalTitle).toBe('Edit Widget')
		expect(wrapper.vm.submitLabel).toBe('Save')
	})

	it('switching type resets the sub-form content to the new defaults', async () => {
		const { CnAddWidgetModal } = loadModal({
			label: { defaultContent: { text: 'l' } },
			text: { defaultContent: { body: 't' } },
		})
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		// start on label, simulate in-progress edit
		wrapper.vm.state.content = { text: 'in-progress' }
		// switch type via the select
		wrapper.vm.state.type = 'text'
		wrapper.vm.onTypeSwitch()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.state.content).toEqual({ body: 't' })
	})

	it('cancel emits close and never submit', () => {
		const { CnAddWidgetModal } = loadModal({ label: {} })
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		wrapper.vm.onCancel()
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('submit')).toBeFalsy()
	})

	it('Esc emits close and never submit', () => {
		const { CnAddWidgetModal } = loadModal({ label: {} })
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		wrapper.vm.onKeydown({ key: 'Escape' })
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('submit')).toBeFalsy()
	})

	it('onSubmit is a no-op when invalid', () => {
		const { CnAddWidgetModal } = loadModal({
			label: { form: fakeForm({ errors: ['nope'] }) },
		})
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		wrapper.vm.onSubmit()
		expect(wrapper.emitted('submit')).toBeFalsy()
	})
})
