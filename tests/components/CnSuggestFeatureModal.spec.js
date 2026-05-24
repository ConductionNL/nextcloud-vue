/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnSuggestFeatureModal — feature-request submission dialog. The
 * dialog hosts two submission paths: a primary "Continue on GitHub" button
 * that builds a deep-link to the repo's Issue Form and opens it in a new
 * tab, and a secondary "Send to Conduction" button that emits a payload
 * the parent forwards to Pipelinq's Contactmoment intake (Path B). No
 * server-side write proxy is involved — Path A is pure client-side.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnSuggestFeatureModal")
 */

import { mount } from '@vue/test-utils'

import CnSuggestFeatureModal from '../../src/components/CnSuggestFeatureModal/CnSuggestFeatureModal.vue'

const stubs = {
	NcDialog: { name: 'NcDialog', template: '<div class="dialog"><slot /><div class="dialog-actions"><slot name="actions" /></div></div>' },
	NcTextField: {
		name: 'NcTextField',
		props: ['value', 'label', 'maxlength', 'error', 'helperText', 'required'],
		model: { prop: 'value', event: 'update:value' },
		template: '<div class="text-field" :data-label="label"><input :value="value" @input="$emit(\'update:value\', $event.target.value)" /></div>',
	},
	NcTextArea: {
		name: 'NcTextArea',
		props: ['value', 'label', 'maxlength', 'error', 'helperText', 'required', 'rows'],
		model: { prop: 'value', event: 'update:value' },
		template: '<div class="text-area" :data-label="label"><textarea :value="value" @input="$emit(\'update:value\', $event.target.value)" /></div>',
	},
	NcCheckboxRadioSwitch: {
		name: 'NcCheckboxRadioSwitch',
		props: ['checked', 'type'],
		template: '<label class="switch"><input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" /><slot /></label>',
	},
	NcNoteCard: { name: 'NcNoteCard', props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcButton: {
		name: 'NcButton',
		props: ['type', 'disabled', 'title'],
		template: '<button class="btn" :data-type="type" :disabled="disabled" :title="title" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
	OpenInNew: true,
}

const fillValid = async (wrapper) => {
	await wrapper.find('.text-field input').setValue('Add timeline filter')
	await wrapper.find('.text-area textarea').setValue('A short description with more than ten characters.')
}

describe('CnSuggestFeatureModal', () => {
	let originalOpen
	beforeEach(() => {
		originalOpen = window.open
		window.open = jest.fn()
	})
	afterEach(() => {
		window.open = originalOpen
	})

	it('renders the title, body, info card, and three action buttons', () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		expect(wrapper.find('[data-label="Title"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Description"]').exists()).toBe(true)
		const note = wrapper.findComponent({ name: 'NcNoteCard' })
		expect(note.exists()).toBe(true)
		expect(note.props('type')).toBe('info')
		expect(note.text()).toContain('Why continue on GitHub?')
		const buttons = wrapper.findAll('.dialog-actions button.btn')
		expect(buttons).toHaveLength(3)
	})

	it('GitHub button is primary, both submit buttons disabled until form is valid', () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		const buttons = wrapper.findAll('.dialog-actions button.btn')
		expect(buttons.at(2).attributes('data-type')).toBe('primary')
		expect(buttons.at(2).text()).toContain('Continue on GitHub')
		expect(buttons.at(1).text()).toContain('Send to Conduction')
		expect(buttons.at(1).attributes('disabled')).toBeDefined()
		expect(buttons.at(2).attributes('disabled')).toBeDefined()
	})

	it('enables the GitHub button once title + body satisfy length rules', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		await fillValid(wrapper)
		const githubBtn = wrapper.findAll('.dialog-actions button.btn').at(2)
		expect(githubBtn.attributes('disabled')).toBeUndefined()
	})

	it('Conduction button stays disabled when conduction-submit-enabled is false', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		await fillValid(wrapper)
		const conductionBtn = wrapper.findAll('.dialog-actions button.btn').at(1)
		expect(conductionBtn.attributes('disabled')).toBeDefined()
		expect(conductionBtn.attributes('title')).toContain('Coming soon')
	})

	it('Conduction button becomes enabled when conduction-submit-enabled is true', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq', conductionSubmitEnabled: true } })
		await fillValid(wrapper)
		const conductionBtn = wrapper.findAll('.dialog-actions button.btn').at(1)
		expect(conductionBtn.attributes('disabled')).toBeUndefined()
	})

	it('GitHub submit opens the pre-filled Issue Form URL in a new tab and emits close', async () => {
		const wrapper = mount(CnSuggestFeatureModal, {
			stubs,
			propsData: {
				repo: 'ConductionNL/pipelinq',
				specRef: 'client-management',
				app: 'pipelinq',
				page: 'clients-index (/clients)',
				surface: 'contacts-list-sidebar',
				object: 'pipelinq · Client',
			},
		})
		await fillValid(wrapper)
		await wrapper.findAll('.dialog-actions button.btn').at(2).trigger('click')

		expect(window.open).toHaveBeenCalledTimes(1)
		const [url, target, features] = window.open.mock.calls[0]
		expect(target).toBe('_blank')
		expect(features).toBe('noopener,noreferrer')
		expect(url).toMatch(/^https:\/\/github\.com\/ConductionNL\/pipelinq\/issues\/new\?/)
		expect(url).toContain('template=feature-request.yml')
		expect(url).toMatch(/title=%5BFEATURE%5D\+Add\+timeline\+filter/)
		expect(url).toMatch(/problem=A\+short\+description/)
		expect(url).toContain('app=pipelinq')
		expect(url).toMatch(/page=clients-index\+%28%2Fclients%29/)
		expect(url).toContain('surface=contacts-list-sidebar')
		expect(url).toMatch(/object=pipelinq\+%C2%B7\+Client/)
		expect(url).toContain('spec-ref=client-management')

		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('Conduction submit emits submit-conduction with the full payload and closes', async () => {
		const wrapper = mount(CnSuggestFeatureModal, {
			stubs,
			propsData: {
				repo: 'ConductionNL/pipelinq',
				conductionSubmitEnabled: true,
				specRef: 'client-management',
				app: 'pipelinq',
				page: 'clients-index',
				surface: 'contacts-list-sidebar',
				object: 'pipelinq · Client',
			},
		})
		await fillValid(wrapper)
		await wrapper.findAll('.dialog-actions button.btn').at(1).trigger('click')

		expect(wrapper.emitted('submit-conduction')).toBeTruthy()
		const payload = wrapper.emitted('submit-conduction')[0][0]
		expect(payload).toMatchObject({
			title: 'Add timeline filter',
			body: 'A short description with more than ten characters.',
			repo: 'ConductionNL/pipelinq',
			specRef: 'client-management',
			app: 'pipelinq',
			page: 'clients-index',
			surface: 'contacts-list-sidebar',
			object: 'pipelinq · Client',
		})
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(window.open).not.toHaveBeenCalled()
	})

	it('cancel emits close without firing either submission path', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		await fillValid(wrapper)
		await wrapper.findAll('.dialog-actions button.btn').at(0).trigger('click')
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(window.open).not.toHaveBeenCalled()
		expect(wrapper.emitted('submit-conduction')).toBeFalsy()
	})

	it('uses Nextcloud CSS variables only (no --nldesign- references)', () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})
})
