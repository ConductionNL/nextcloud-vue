/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnSuggestFeatureModal — the proposal-grade feature-request
 * dialog. Five structured user-written fields (title, problem,
 * proposed-solution, who-benefits, priority-to-you) plus one optional
 * context field (anythingElse) plus the auto-captured context fields
 * (app, page, surface, object, spec-ref). Two submission paths:
 * GitHub deep-link (primary) and Conduction emit (secondary).
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
	NcSelect: {
		name: 'NcSelect',
		props: ['value', 'label', 'options', 'inputLabel', 'placeholder', 'clearable'],
		model: { prop: 'value', event: 'input' },
		template: '<select class="select" :data-label="label" :value="value" @change="$emit(\'input\', $event.target.value)"><option value="">--</option><option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option></select>',
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
	await wrapper.find('[data-label="Title"] input').setValue('Add timeline filter')
	await wrapper.find('[data-label="Problem"] textarea').setValue('I want to filter contacts by last interaction date but the list view does not support it.')
	await wrapper.find('[data-label="Proposed solution"] textarea').setValue('A date-range filter in the contacts list sidebar, defaulting to last 30 days.')
	await wrapper.find('[data-label="Who benefits"] textarea').setValue('Account managers tracking client engagement.')
	await wrapper.find('select.select').setValue('Would use weekly')
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

	it('renders intro card + five structured fields + three buttons', () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		const notes = wrapper.findAllComponents({ name: 'NcNoteCard' })
		expect(notes).toHaveLength(2)
		expect(notes.at(0).text()).toContain('Help us land this faster.')
		expect(notes.at(1).text()).toContain('Why continue on GitHub?')
		expect(wrapper.find('[data-label="Title"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Problem"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Proposed solution"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Who benefits"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="How important is this to you?"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Anything else?"]').exists()).toBe(true)
		expect(wrapper.findAll('.dialog-actions button.btn')).toHaveLength(3)
	})

	it('GitHub button stays disabled until every required field is satisfied', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		const githubBtn = () => wrapper.findAll('.dialog-actions button.btn').at(2)
		expect(githubBtn().attributes('disabled')).toBeDefined()
		await wrapper.find('[data-label="Title"] input').setValue('Add timeline filter')
		await wrapper.find('[data-label="Problem"] textarea').setValue('Short problem statement.')
		expect(githubBtn().attributes('disabled')).toBeDefined()
		await wrapper.find('[data-label="Proposed solution"] textarea').setValue('A date-range filter in the sidebar.')
		await wrapper.find('[data-label="Who benefits"] textarea').setValue('Account managers.')
		await wrapper.find('select.select').setValue('Nice to have')
		expect(githubBtn().attributes('disabled')).toBeUndefined()
	})

	it('Conduction button stays disabled when conduction-submit-enabled is false', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		await fillValid(wrapper)
		const conductionBtn = wrapper.findAll('.dialog-actions button.btn').at(1)
		expect(conductionBtn.attributes('disabled')).toBeDefined()
		expect(conductionBtn.attributes('title')).toContain('Coming soon')
	})

	it('GitHub submit opens deep-link with every structured field + context param pre-filled', async () => {
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
		await wrapper.find('[data-label="Anything else?"] textarea').setValue('Avoid: hiding the filter behind a settings page.')
		await wrapper.findAll('.dialog-actions button.btn').at(2).trigger('click')

		expect(window.open).toHaveBeenCalledTimes(1)
		const url = window.open.mock.calls[0][0]
		expect(url).toMatch(/^https:\/\/github\.com\/ConductionNL\/pipelinq\/issues\/new\?/)
		expect(url).toContain('template=feature-request.yml')
		expect(url).toMatch(/title=%5BFEATURE%5D\+Add\+timeline\+filter/)
		expect(url).toMatch(/problem=I\+want\+to\+filter\+contacts/)
		expect(url).toMatch(/proposed-solution=A\+date-range\+filter/)
		expect(url).toMatch(/who-benefits=Account\+managers/)
		expect(url).toContain('priority-to-you=Would+use+weekly')
		expect(url).toMatch(/context=Avoid%3A\+hiding\+the\+filter/)
		expect(url).toContain('app=pipelinq')
		expect(url).toMatch(/page=clients-index\+%28%2Fclients%29/)
		expect(url).toContain('surface=contacts-list-sidebar')
		expect(url).toMatch(/object=pipelinq\+%C2%B7\+Client/)
		expect(url).toContain('spec-ref=client-management')

		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('GitHub submit omits empty optional params from the URL', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		await fillValid(wrapper)
		await wrapper.findAll('.dialog-actions button.btn').at(2).trigger('click')
		const url = window.open.mock.calls[0][0]
		expect(url).not.toContain('context=')
		expect(url).not.toContain('app=')
		expect(url).not.toContain('page=')
		expect(url).not.toContain('surface=')
		expect(url).not.toContain('object=')
		expect(url).not.toContain('spec-ref=')
	})

	it('Conduction submit emits the full structured payload and closes', async () => {
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
		await wrapper.find('[data-label="Anything else?"] textarea').setValue('Some extra context.')
		await wrapper.findAll('.dialog-actions button.btn').at(1).trigger('click')

		expect(wrapper.emitted('submit-conduction')).toBeTruthy()
		const payload = wrapper.emitted('submit-conduction')[0][0]
		expect(payload).toMatchObject({
			title: 'Add timeline filter',
			problem: 'I want to filter contacts by last interaction date but the list view does not support it.',
			proposedSolution: 'A date-range filter in the contacts list sidebar, defaulting to last 30 days.',
			whoBenefits: 'Account managers tracking client engagement.',
			priorityToYou: 'Would use weekly',
			anythingElse: 'Some extra context.',
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
