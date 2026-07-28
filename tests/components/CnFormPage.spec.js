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
import { h } from 'vue'
import CnFormPage from '@/components/CnFormPage/CnFormPage.vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

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
		props: ['label', 'type', 'value', 'error', 'helperText'],
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

/**
 * manifest-form-logic (REQ-MFL-6/7/9/10/11/12): steps, conditional
 * visibility, validation gating, error surfacing, and public-mode /
 * CnWidgetFormRenderer interplay.
 */
describe('CnFormPage — manifest-form-logic', () => {
	let warnSpy

	beforeEach(() => {
		jest.clearAllMocks()
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
		if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore()
	})

	describe('steps: indicator + navigation (REQ-MFL-6)', () => {
		it('renders a two-entry step indicator, only step-1 fields, Next (no Submit)', () => {
			const fields = [
				{ key: 'a', type: 'string', label: 'A' },
				{ key: 'b', type: 'string', label: 'B' },
			]
			const steps = [
				{ id: 's1', title: 'One', fields: ['a'] },
				{ id: 's2', title: 'Two', fields: ['b'] },
			]
			const wrapper = mountForm({ fields, steps, submitHandler: 'submit' })

			const items = wrapper.findAll('.cn-form-page__step')
			expect(items.length).toBe(2)
			expect(items.at(0).attributes('aria-current')).toBe('step')
			expect(items.at(1).attributes('aria-current')).toBeUndefined()

			expect(wrapper.findAll('.cn-form-page__field').length).toBe(1)
			expect(wrapper.find('.cn-form-page__field').attributes('data-field-key')).toBe('a')

			const buttons = wrapper.findAll('.nc-button-stub')
			expect(buttons.length).toBe(1)
			expect(buttons.at(0).text()).toBe('Next')
		})

		it('no steps ⇒ no indicator, no Next/Back — today\'s single-step rendering', () => {
			const fields = [{ key: 'a', type: 'string', label: 'A' }]
			const wrapper = mountForm({ fields, submitHandler: 'submit' })
			expect(wrapper.find('.cn-form-page__steps').exists()).toBe(false)
			expect(wrapper.findAll('.nc-button-stub').length).toBe(1)
			expect(wrapper.find('.nc-button-stub').text()).not.toBe('Next')
		})

		it('Next/Back move between steps, emit @step, and retain draft values', async () => {
			const fields = [
				{ key: 'a', type: 'string', label: 'A' },
				{ key: 'b', type: 'string', label: 'B' },
			]
			const steps = [
				{ id: 's1', title: 'One', fields: ['a'] },
				{ id: 's2', title: 'Two', fields: ['b'] },
			]
			const wrapper = mountForm({ fields, steps, submitHandler: 'submit' })

			wrapper.vm.updateField('a', 'hello')
			wrapper.vm.next()
			await wrapper.vm.$nextTick()

			expect(wrapper.emitted('step')[0][0]).toEqual({ from: 0, to: 1 })
			expect(wrapper.find('.cn-form-page__field').attributes('data-field-key')).toBe('b')
			expect(wrapper.findAll('.nc-button-stub').length).toBe(2) // Back + Submit

			wrapper.vm.back()
			await wrapper.vm.$nextTick()

			expect(wrapper.emitted('step')[1][0]).toEqual({ from: 1, to: 0 })
			expect(wrapper.vm.formData.a).toBe('hello')
			expect(wrapper.find('.cn-form-page__field').attributes('data-field-key')).toBe('a')
		})

		it('a step whose fields are ALL hidden is skipped in both directions', async () => {
			const fields = [
				{ key: 'kind', type: 'enum', label: 'Kind', enum: ['a', 'b'] },
				{ key: 'never', type: 'string', label: 'Never', visibleWhen: { field: 'kind', op: 'eq', value: 'impossible' } },
				{ key: 'c', type: 'string', label: 'C' },
			]
			const steps = [
				{ id: 's1', title: 'One', fields: ['kind'] },
				{ id: 's2', title: 'Two', fields: ['never'] },
				{ id: 's3', title: 'Three', fields: ['c'] },
			]
			const wrapper = mountForm({ fields, steps, submitHandler: 'submit' })
			wrapper.vm.next()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.currentStepIndex).toBe(2)
		})
	})

	describe('validation gating (REQ-MFL-7)', () => {
		it('an invalid required field blocks Next, renders the error, and moves focus', async () => {
			const fields = [
				{ key: 'name', type: 'string', label: 'Name', validation: { required: true } },
				{ key: 'b', type: 'string', label: 'B' },
			]
			const steps = [
				{ id: 's1', title: 'One', fields: ['name'] },
				{ id: 's2', title: 'Two', fields: ['b'] },
			]
			const wrapper = mountForm({ fields, steps, submitHandler: 'submit' }, {
				mountOptions: { attachTo: document.body },
			})

			wrapper.vm.next()
			await wrapper.vm.$nextTick()
			await flushPromises()

			expect(wrapper.vm.currentStepIndex).toBe(0)
			expect(wrapper.vm.fieldErrors.name).toBeTruthy()
			const input = wrapper.find('[data-field-key="name"] input')
			expect(document.activeElement).toBe(input.element)

			wrapper.unmount()
		})

		it('submit failure jumps to the earliest step containing an invalid field', async () => {
			const handler = jest.fn().mockResolvedValue(undefined)
			const fields = [
				{ key: 'a', type: 'string', label: 'A', validation: { required: true } },
				{ key: 'b', type: 'string', label: 'B' },
			]
			const steps = [
				{ id: 's1', title: 'One', fields: ['a'] },
				{ id: 's2', title: 'Two', fields: ['b'] },
			]
			const wrapper = mountForm(
				{ fields, steps, submitHandler: 'submit' },
				{ cnCustomComponents: { submit: handler } },
			)

			wrapper.vm.updateField('a', 'ok')
			wrapper.vm.next()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.currentStepIndex).toBe(1)

			// Step-1 field cleared via a #field-<key> slot's onInput after Next passed.
			wrapper.vm.updateField('a', '')
			await wrapper.vm.submit()

			expect(handler).not.toHaveBeenCalled()
			expect(wrapper.vm.currentStepIndex).toBe(0)
		})

		it('editing a field clears its validation error', async () => {
			const fields = [{ key: 'name', type: 'string', label: 'Name', validation: { required: true } }]
			const wrapper = mountForm({ fields, submitHandler: 'submit' })
			await wrapper.vm.submit()
			expect(wrapper.vm.fieldErrors.name).toBeTruthy()
			wrapper.vm.updateField('name', 'Ada')
			expect(wrapper.vm.fieldErrors.name).toBeUndefined()
		})
	})

	describe('LOCAL conditional visibility (REQ-MFL-9)', () => {
		it('a field appears when its condition becomes true, without remounting the form', async () => {
			const fields = [
				{ key: 'kind', type: 'enum', label: 'Kind', enum: ['person', 'company'] },
				{ key: 'kvk', type: 'string', label: 'KvK', visibleWhen: { field: 'kind', op: 'eq', value: 'company' } },
			]
			const wrapper = mountForm({ fields, submitHandler: 'submit' })
			expect(wrapper.find('[data-field-key="kvk"]').exists()).toBe(false)
			wrapper.vm.updateField('kind', 'company')
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-field-key="kvk"]').exists()).toBe(true)
		})

		it('a chained hide cascades: hiding b also hides c (b reads undefined for c)', async () => {
			const fields = [
				{ key: 'a', type: 'string', label: 'A' },
				{ key: 'b', type: 'string', label: 'B', visibleWhen: { field: 'a', op: 'eq', value: 'x' } },
				{ key: 'c', type: 'string', label: 'C', visibleWhen: { field: 'b', op: 'eq', value: 'y' } },
			]
			const wrapper = mountForm({ fields, submitHandler: 'submit' })
			wrapper.vm.updateField('a', 'x')
			await wrapper.vm.$nextTick()
			wrapper.vm.updateField('b', 'y')
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-field-key="c"]').exists()).toBe(true)

			wrapper.vm.updateField('a', 'z')
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-field-key="b"]').exists()).toBe(false)
			expect(wrapper.find('[data-field-key="c"]').exists()).toBe(false)
		})

		it('an endpoint condition resolves once at mount, fail-safe hidden, and never re-fetches on keystrokes', async () => {
			const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'))
			const fields = [
				{ key: 'a', type: 'string', label: 'A' },
				{ key: 'flagged', type: 'string', label: 'Flagged', visibleWhen: { endpoint: '/broken', field: 'flag', op: 'eq', value: true } },
			]
			const wrapper = mountForm({ fields, submitHandler: 'submit' })
			await flushPromises()

			expect(wrapper.find('[data-field-key="flagged"]').exists()).toBe(false)
			expect(fetchSpy).toHaveBeenCalledTimes(1)

			wrapper.vm.updateField('a', 'typing away')
			await wrapper.vm.$nextTick()
			expect(fetchSpy).toHaveBeenCalledTimes(1)
		})
	})

	describe('hidden-field exclusion (REQ-MFL-10)', () => {
		it('a hidden required field does not block submit, is excluded from the payload, and its draft is retained + restored', async () => {
			const handler = jest.fn().mockResolvedValue(undefined)
			const fields = [
				{ key: 'kind', type: 'enum', label: 'Kind', enum: ['person', 'company'] },
				{
					key: 'kvk',
					type: 'string',
					label: 'KvK',
					visibleWhen: { field: 'kind', op: 'eq', value: 'company' },
					validation: { required: true },
				},
			]
			const wrapper = mountForm(
				{ fields, submitHandler: 'submit', mode: 'edit' },
				{ cnCustomComponents: { submit: handler } },
			)

			wrapper.vm.updateField('kind', 'company')
			await wrapper.vm.$nextTick()
			wrapper.vm.updateField('kvk', '12345678')
			await wrapper.vm.$nextTick()
			wrapper.vm.updateField('kind', 'person')
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-field-key="kvk"]').exists()).toBe(false)

			await wrapper.vm.submit()

			expect(handler).toHaveBeenCalledTimes(1)
			const payload = handler.mock.calls[0][0]
			expect(payload).not.toHaveProperty('kvk')
			expect(wrapper.vm.formData.kvk).toBe('12345678')

			wrapper.vm.updateField('kind', 'company')
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-field-key="kvk"]').exists()).toBe(true)
			expect(wrapper.find('[data-field-key="kvk"] input').element.value).toBe('12345678')
		})
	})

	describe('accessible error surfacing (REQ-MFL-11)', () => {
		it('a failing string field receives NcTextField error + helperText props', async () => {
			const fields = [{ key: 'name', type: 'string', label: 'Name', validation: { required: true } }]
			const wrapper = mountForm({ fields, submitHandler: 'submit' })
			await wrapper.vm.submit()
			await wrapper.vm.$nextTick()
			// VTU v1's `find('.class')` returned a *component* wrapper when the
			// class sat on a child component's root, so `.props()` worked. VTU
			// v2 split the two: `find()` is DOM-only (DOMWrapper, no `props()`)
			// and component lookups go through `findComponent()`.
			const input = wrapper.findComponent({ name: 'NcTextField' })
			expect(input.props('error')).toBe(true)
			expect(input.props('helperText')).toBeTruthy()
		})

		it('a failing enum field renders an adjacent role="alert" element', async () => {
			const fields = [{ key: 'kind', type: 'enum', label: 'Kind', enum: ['a', 'b'], validation: { required: true } }]
			const wrapper = mountForm({ fields, submitHandler: 'submit' })
			await wrapper.vm.submit()
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[role="alert"]').exists()).toBe(true)
		})

		it('a #field-<key> slot override receives the error in its scoped props', async () => {
			const fields = [{ key: 'rating', type: 'number', label: 'Rating', validation: { required: true } }]
			const wrapper = mountForm({ fields, submitHandler: 'submit' }, {
				mountOptions: {
					scopedSlots: {
						// Vue 3 has no `this.$createElement`, no `staticClass`, and no
						// nested `attrs:` — slot functions import `h` and pass a flat
						// props object.
						'field-rating'(props) {
							return h('div', { class: 'custom-rating', 'data-error': props.error || '' })
						},
					},
				},
			})
			await wrapper.vm.submit()
			await wrapper.vm.$nextTick()
			const custom = wrapper.find('.custom-rating')
			expect(custom.exists()).toBe(true)
			expect(custom.attributes('data-error')).toBeTruthy()
		})
	})

	describe('public mode + CnWidgetFormRenderer interplay (REQ-MFL-12)', () => {
		it('a public-mode wizard only shows the success banner after the FINAL step dispatches', async () => {
			const handler = jest.fn().mockResolvedValue(undefined)
			const fields = [
				{ key: 'a', type: 'string', label: 'A' },
				{ key: 'b', type: 'string', label: 'B' },
			]
			const steps = [
				{ id: 's1', title: 'One', fields: ['a'] },
				{ id: 's2', title: 'Two', fields: ['b'] },
			]
			const wrapper = mountForm(
				{ fields, steps, submitHandler: 'submit', mode: 'public' },
				{ cnCustomComponents: { submit: handler } },
			)

			wrapper.vm.next()
			await wrapper.vm.$nextTick()
			expect(wrapper.find('.cn-form-page__success').exists()).toBe(false)
			expect(handler).not.toHaveBeenCalled()

			await wrapper.vm.submit()
			expect(handler).toHaveBeenCalledTimes(1)
			expect(wrapper.find('.cn-form-page__success').exists()).toBe(true)
		})
	})
})
