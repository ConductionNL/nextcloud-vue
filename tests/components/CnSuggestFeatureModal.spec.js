/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnSuggestFeatureModal — feature-request submission dialog. Covers form
 * validation (submit disabled until valid), the success / inline-error / 412 paths,
 * and that the CSRF-protected POST carries the expected body shape.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnSuggestFeatureModal")
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn() },
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'

import CnSuggestFeatureModal from '../../src/components/CnSuggestFeatureModal/CnSuggestFeatureModal.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// v-model-aware stubs for the NC form controls so we can drive the form from tests.
const stubs = {
	NcDialog: { name: 'NcDialog', template: '<div class="dialog"><slot /><div class="dialog-actions"><slot name="actions" /></div></div>' },
	NcTextField: {
		name: 'NcTextField',
		props: ['value', 'label', 'maxlength', 'error', 'helperText', 'required'],
		template: '<input class="tf" :value="value" @input="$emit(\'input\', $event.target.value)" />',
	},
	NcTextArea: {
		name: 'NcTextArea',
		props: ['value', 'label', 'maxlength', 'error', 'helperText', 'required', 'rows'],
		template: '<textarea class="ta" :value="value" @input="$emit(\'input\', $event.target.value)" />',
	},
	NcButton: {
		name: 'NcButton',
		props: ['type', 'variant', 'disabled'],
		template: '<button class="btn" :data-type="variant || type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	NcNoteCard: { name: 'NcNoteCard', props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	NcCheckboxRadioSwitch: { name: 'NcCheckboxRadioSwitch', props: ['checked', 'type'], template: '<label class="switch"><slot /></label>' },
}

const fillForm = async (wrapper, { title, body }) => {
	await wrapper.find('input.tf').setValue(title)
	await wrapper.find('textarea.ta').setValue(body)
}

// The submit button is the second NcButton (first is Cancel).
const submitButton = (wrapper) => wrapper.findAll('button.btn').wrappers.find((b) => b.attributes('data-type') === 'primary')

describe('CnSuggestFeatureModal', () => {
	beforeEach(() => {
		axios.post.mockReset()
	})

	it('disables submit when the title is shorter than 3 chars', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await fillForm(wrapper, { title: 'Hi', body: 'A valid body of at least ten characters.' })
		expect(submitButton(wrapper).attributes('disabled')).toBeTruthy()
	})

	it('disables submit when the body is shorter than 10 chars', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await fillForm(wrapper, { title: 'A valid title', body: 'short' })
		expect(submitButton(wrapper).attributes('disabled')).toBeTruthy()
	})

	it('enables submit once title + body are valid', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await fillForm(wrapper, { title: 'A valid title', body: 'A valid body of at least ten characters.' })
		expect(submitButton(wrapper).attributes('disabled')).toBeFalsy()
	})

	it('POSTs {repo, title, body} and emits submitted + close on 201', async () => {
		axios.post.mockResolvedValue({ status: 201, data: { number: 1247, html_url: 'https://github.com/ConductionNL/openregister/issues/1247', state: 'open' } })
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await fillForm(wrapper, { title: 'Add dark mode', body: 'A detailed description, at least ten chars.' })
		await submitButton(wrapper).trigger('click')
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.post).toHaveBeenCalledTimes(1)
		const [, body] = axios.post.mock.calls[0]
		expect(body).toMatchObject({ repo: 'ConductionNL/openregister', title: 'Add dark mode', body: 'A detailed description, at least ten chars.' })
		expect(body).not.toHaveProperty('specRef')

		expect(wrapper.emitted('submitted')).toBeTruthy()
		expect(wrapper.emitted('submitted')[0][0]).toMatchObject({ number: 1247 })
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('includes specRef in the POST body when the prop is set', async () => {
		axios.post.mockResolvedValue({ status: 201, data: { number: 1, html_url: 'x', state: 'open' } })
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister', specRef: 'catalog-management' } })
		await fillForm(wrapper, { title: 'A valid title', body: 'A valid body of at least ten characters.' })
		await submitButton(wrapper).trigger('click')
		await flush()

		const [, body] = axios.post.mock.calls[0]
		expect(body.specRef).toBe('catalog-management')
	})

	it('shows an inline rate-limit message on HTTP 429 and stays open', async () => {
		axios.post.mockRejectedValue({ response: { status: 429, data: { error: 'rate_limited', retry_after: 42 } } })
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await fillForm(wrapper, { title: 'A valid title', body: 'A valid body of at least ten characters.' })
		await submitButton(wrapper).trigger('click')
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.note[data-type="error"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('42')
		expect(wrapper.emitted('close')).toBeFalsy()
	})

	it('emits connect-requested style behaviour absent — 412 produces an inline error (no silent close)', async () => {
		// The spec scenario for 412 in the modal: stays open with an inline message routed to
		// the "GitHub submissions are not configured" / generic-error branch (the controller
		// returns 412 only when the framework rejects CSRF; functionally the modal treats any
		// non-201 it can't classify as a generic inline error).
		axios.post.mockRejectedValue({ response: { status: 412 } })
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await fillForm(wrapper, { title: 'A valid title', body: 'A valid body of at least ten characters.' })
		await submitButton(wrapper).trigger('click')
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.note[data-type="error"]').exists()).toBe(true)
		expect(wrapper.emitted('close')).toBeFalsy()
	})

	it('shows a generic inline error on an unclassified failure', async () => {
		axios.post.mockRejectedValue({ response: { status: 500 } })
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await fillForm(wrapper, { title: 'A valid title', body: 'A valid body of at least ten characters.' })
		await submitButton(wrapper).trigger('click')
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.note[data-type="error"]').exists()).toBe(true)
		expect(wrapper.text().toLowerCase()).toContain('could not submit')
	})
})
