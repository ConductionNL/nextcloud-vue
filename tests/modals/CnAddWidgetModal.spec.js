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
		CnAddWidgetModal = require('../../src/modals/CnAddWidgetModal.vue').default
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

	it('mounts the first available type\'s sub-form on open', () => {
		const { CnAddWidgetModal } = loadModal({ label: { displayName: 'Label' } })
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		expect(wrapper.find('.fake-form').exists()).toBe(true)
		expect(wrapper.vm.state.type).toBe('label')
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
		expect(wrapper.emitted('submit')[0][0]).toEqual({ type: 'label', content: { text: 'hi' } })
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
