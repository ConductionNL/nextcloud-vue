/**
 * Tests for CnFormPage.
 *
 * Covers REQ-MFPT-* of the manifest-form-page-type spec — the new
 * `type: "form"` page renderer. Field dispatch, submit-via-handler
 * dispatch, submit-via-endpoint dispatch (with `:param` substitution),
 * error display, success message, slot overrides.
 *
 * Mocks `@nextcloud/axios` so endpoint-mode submits are observable
 * without hitting a real HTTP stack.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		post: jest.fn(),
		put: jest.fn(),
		patch: jest.fn(),
	},
}))

import { mount } from '@vue/test-utils'
import CnFormPage from '@/components/CnFormPage/CnFormPage.vue'

const stubs = {
	CnPageHeader: {
		template: '<div class="cn-page-header-stub" />',
		props: ['title', 'description', 'icon'],
	},
	NcButton: {
		template: '<button class="nc-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
		props: ['type', 'nativeType', 'disabled'],
	},
	NcLoadingIcon: { template: '<span class="nc-loading-stub" />' },
	Send: { template: '<span class="send-stub" />' },
	NcCheckboxRadioSwitch: {
		template: '<label class="nc-checkbox-stub"><input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)"><slot /></label>',
		props: ['checked', 'label'],
	},
	NcTextField: {
		template: '<input class="nc-textfield-stub" :type="type" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
		props: ['label', 'type', 'value'],
	},
	NcSelect: {
		template: '<select class="nc-select-stub" @change="$emit(\'input\', { value: $event.target.value })"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
		props: ['inputLabel', 'options', 'value'],
	},
	CnJsonViewer: { template: '<pre class="cn-json-viewer-stub" />', props: ['value', 'label'] },
}

const mountForm = (propsData, opts = {}) => mount(CnFormPage, {
	propsData,
	stubs,
	mocks: {
		$route: opts.$route ?? { params: {} },
		$router: opts.$router ?? { push: jest.fn() },
	},
	provide: {
		cnCustomComponents: opts.cnCustomComponents ?? {},
	},
	...opts.mountOptions,
})

describe('CnFormPage', () => {
	let warnSpy

	beforeEach(() => {
		jest.clearAllMocks()
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('renders one input per field, dispatching by field.type', () => {
		const fields = [
			{ key: 'name', type: 'string', label: 'Name' },
			{ key: 'agree', type: 'boolean', label: 'Agree' },
			{ key: 'rating', type: 'number', label: 'Rating' },
			{ key: 'pw', type: 'password', label: 'Password' },
		]
		const wrapper = mountForm({ fields, submitHandler: 'submit' })
		expect(wrapper.findAll('.nc-textfield-stub').length).toBeGreaterThanOrEqual(3) // string, number, password
		expect(wrapper.findAll('.nc-checkbox-stub').length).toBe(1)
	})

	it('widget: "textarea" renders a textarea fallback for string fields', () => {
		const fields = [{ key: 'comment', type: 'string', widget: 'textarea', label: 'Comment' }]
		const wrapper = mountForm({ fields, submitHandler: 'submit' })
		// Either NcTextArea (when present) or native <textarea> renders.
		const html = wrapper.html()
		expect(html).toMatch(/textarea/i)
	})

	it('endpoint mode: submit posts to submitEndpoint with formData', async () => {
		const axios = require('@nextcloud/axios').default
		axios.post.mockResolvedValueOnce({ data: {} })
		const fields = [{ key: 'email', type: 'string', label: 'Email' }]
		const wrapper = mountForm({ fields, submitEndpoint: '/api/forms' })
		wrapper.vm.formData.email = 'a@b.c'
		await wrapper.vm.submit()
		expect(axios.post).toHaveBeenCalledWith('/api/forms', expect.objectContaining({ email: 'a@b.c' }))
	})

	it('endpoint mode: resolves :param segments from $route.params', async () => {
		const axios = require('@nextcloud/axios').default
		axios.post.mockResolvedValueOnce({ data: {} })
		const fields = [{ key: 'note', type: 'string', label: 'Note' }]
		const wrapper = mountForm(
			{ fields, submitEndpoint: '/api/survey/:token' },
			{ $route: { params: { token: 'abc123' } } },
		)
		await wrapper.vm.submit()
		expect(axios.post).toHaveBeenCalledWith('/api/survey/abc123', expect.any(Object))
	})

	it('endpoint mode: honours submitMethod for PUT', async () => {
		const axios = require('@nextcloud/axios').default
		axios.put.mockResolvedValueOnce({ data: {} })
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm({ fields, submitEndpoint: '/api/x', submitMethod: 'PUT' })
		await wrapper.vm.submit()
		expect(axios.put).toHaveBeenCalled()
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('handler mode: calls registered customComponents handler with (formData, $route, $router)', async () => {
		const handler = jest.fn().mockResolvedValue(undefined)
		const fields = [{ key: 'name', type: 'string', label: 'Name' }]
		const $route = { params: { id: '7' } }
		const $router = { push: jest.fn() }
		const wrapper = mountForm(
			{ fields, submitHandler: 'submitForm' },
			{ cnCustomComponents: { submitForm: handler }, $route, $router },
		)
		wrapper.vm.formData.name = 'Ada'
		await wrapper.vm.submit()
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Ada' }),
			$route,
			$router,
		)
	})

	it('handler mode: warns + emits @error when handler not registered', async () => {
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'noSuchHandler' },
			{ cnCustomComponents: {} },
		)
		await wrapper.vm.submit()
		expect(warnSpy).toHaveBeenCalled()
		expect(wrapper.emitted('error')).toBeTruthy()
	})

	it('emits @input on every field change', () => {
		const fields = [{ key: 'name', type: 'string', label: 'Name' }]
		const wrapper = mountForm({ fields, submitHandler: 'submit' })
		wrapper.vm.updateField('name', 'Carol')
		expect(wrapper.emitted('input')).toBeTruthy()
		expect(wrapper.emitted('input')[0][0]).toEqual({ key: 'name', value: 'Carol' })
	})

	it('emits @submit on successful submit', async () => {
		const handler = jest.fn().mockResolvedValue(undefined)
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'submit' },
			{ cnCustomComponents: { submit: handler } },
		)
		await wrapper.vm.submit()
		expect(wrapper.emitted('submit')).toBeTruthy()
	})

	it('failed submit: surfaces error in DOM and emits @error', async () => {
		const handler = jest.fn().mockRejectedValue(new Error('boom'))
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'submit' },
			{ cnCustomComponents: { submit: handler } },
		)
		await wrapper.vm.submit()
		expect(wrapper.find('.cn-form-page__error').exists()).toBe(true)
		expect(wrapper.find('.cn-form-page__error').text()).toContain('boom')
		expect(wrapper.emitted('error')).toBeTruthy()
	})

	it('successful submit in public mode shows successMessage', async () => {
		const handler = jest.fn().mockResolvedValue(undefined)
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'submit', mode: 'public', successMessage: 'thanks!' },
			{ cnCustomComponents: { submit: handler } },
		)
		await wrapper.vm.submit()
		expect(wrapper.find('.cn-form-page__success').exists()).toBe(true)
		expect(wrapper.find('.cn-form-page__success').text()).toBe('thanks!')
	})

	it('honours #header slot override (mirrors headerComponent dispatch)', () => {
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'submit', title: 'Survey' },
			{
				mountOptions: {
					scopedSlots: { header: '<div class="custom-header">Custom Form Header</div>' },
				},
			},
		)
		expect(wrapper.find('.custom-header').exists()).toBe(true)
	})

	it('honours #field-<key> slot override', () => {
		const fields = [{ key: 'rating', type: 'number', label: 'Rating' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'submit' },
			{
				mountOptions: {
					scopedSlots: {
						'field-rating': '<div class="custom-rating-input">CUSTOM</div>',
					},
				},
			},
		)
		expect(wrapper.find('.custom-rating-input').exists()).toBe(true)
		expect(wrapper.find('.custom-rating-input').text()).toBe('CUSTOM')
	})

	it('honours #submit slot override', () => {
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'submit' },
			{
				mountOptions: {
					scopedSlots: {
						submit: '<button class="my-submit-btn">Send it</button>',
					},
				},
			},
		)
		expect(wrapper.find('.my-submit-btn').exists()).toBe(true)
	})

	it('explicit customComponents prop wins over injected cnCustomComponents', async () => {
		const injected = jest.fn().mockResolvedValue(undefined)
		const explicit = jest.fn().mockResolvedValue(undefined)
		const fields = [{ key: 'x', type: 'string', label: 'X' }]
		const wrapper = mountForm(
			{ fields, submitHandler: 'submit', customComponents: { submit: explicit } },
			{ cnCustomComponents: { submit: injected } },
		)
		await wrapper.vm.submit()
		expect(explicit).toHaveBeenCalled()
		expect(injected).not.toHaveBeenCalled()
	})
})
