/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnSuggestFeatureModal — the proposal-grade feature-request
 * dialog. Five structured user-written fields (title, problem,
 * proposed-solution, who-benefits, priority-to-you) plus one optional
 * context field (anythingElse) plus the auto-captured context fields
 * (app, page, surface, object, spec-ref). Two submission paths:
 * forge deep-link (primary; Codeberg by default, GitHub when the `forge`
 * prop selects it) and Conduction emit (secondary).
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnSuggestFeatureModal")
 */

import { mount } from '@vue/test-utils'

import CnSuggestFeatureModal from '../../src/components/CnSuggestFeatureModal/CnSuggestFeatureModal.vue'

const stubs = {
	NcDialog: { name: 'NcDialog', template: '<div class="dialog"><slot /><div class="dialog-actions"><slot name="actions" /></div></div>' },
	// Vue 3 removed the `model: { prop, event }` option: `v-model` on a
	// component is always `modelValue` + `update:modelValue`. These stubs used
	// the Vue-2 custom-model shape, so the component's v-model bound a
	// `modelValue` prop the stubs did not declare and their `update:value` /
	// `input` emits went nowhere — every field stayed empty and the submit
	// button never enabled.
	NcTextField: {
		name: 'NcTextField',
		props: ['modelValue', 'label', 'maxlength', 'error', 'helperText', 'required'],
		emits: ['update:modelValue'],
		template: '<div class="text-field" :data-label="label"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
	},
	NcTextArea: {
		name: 'NcTextArea',
		props: ['modelValue', 'label', 'maxlength', 'error', 'helperText', 'required', 'rows'],
		emits: ['update:modelValue'],
		template: '<div class="text-area" :data-label="label"><textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
	},
	NcSelect: {
		name: 'NcSelect',
		props: ['modelValue', 'label', 'options', 'inputLabel', 'placeholder', 'clearable'],
		emits: ['update:modelValue'],
		template: '<select class="select" :data-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">--</option><option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option></select>',
	},
	NcNoteCard: { name: 'NcNoteCard', props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcButton: {
		name: 'NcButton',
		props: ['type', 'disabled', 'title'],
		// Vue 3 keeps an UNDECLARED event name in `$attrs` as an `onClick` prop,
		// which then falls through onto this stub's single root `<button>` as a
		// native handler — so the parent's `@click` runs once from the DOM event
		// and once from `$emit('click')`. Vue 2's separate listener channel made
		// that impossible. Declaring the emit removes `onClick` from `$attrs`.
		emits: ['click'],
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
		// The copy is generated from the active forge's display name, so this
		// tracks the default rather than naming a host literally.
		expect(notes.at(1).text()).toContain('Why continue on GitHub?')
		expect(wrapper.find('[data-label="Title"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Problem"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Proposed solution"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Who benefits"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="How important is this to you?"]').exists()).toBe(true)
		expect(wrapper.find('[data-label="Anything else?"]').exists()).toBe(true)
		expect(wrapper.findAll('.dialog-actions button.btn')).toHaveLength(3)
	})

	it('forge submit button stays disabled until every required field is satisfied', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'Conduction/pipelinq' } })
		const forgeBtn = () => wrapper.findAll('.dialog-actions button.btn').at(2)
		expect(forgeBtn().attributes('disabled')).toBeDefined()
		await wrapper.find('[data-label="Title"] input').setValue('Add timeline filter')
		await wrapper.find('[data-label="Problem"] textarea').setValue('Short problem statement.')
		expect(forgeBtn().attributes('disabled')).toBeDefined()
		await wrapper.find('[data-label="Proposed solution"] textarea').setValue('A date-range filter in the sidebar.')
		await wrapper.find('[data-label="Who benefits"] textarea').setValue('Account managers.')
		await wrapper.find('select.select').setValue('Nice to have')
		expect(forgeBtn().attributes('disabled')).toBeUndefined()
	})

	it('Conduction button stays disabled when conduction-submit-enabled is false', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq' } })
		await fillValid(wrapper)
		const conductionBtn = wrapper.findAll('.dialog-actions button.btn').at(1)
		expect(conductionBtn.attributes('disabled')).toBeDefined()
		expect(conductionBtn.attributes('title')).toContain('Coming soon')
	})

	it('default (GitHub) submit opens an Issue-Form deep-link with one query param per field', async () => {
		const wrapper = mount(CnSuggestFeatureModal, {
			stubs,
			propsData: {
				repo: 'Conduction/pipelinq',
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
		expect(url).toMatch(/^https:\/\/github\.com\/Conduction\/pipelinq\/issues\/new\?/)
		// GitHub supports Issue Forms, so each field is its own query param
		// rather than one assembled Markdown body. `template=` names the form
		// that must exist at .github/ISSUE_TEMPLATE/feature-request.yml in the
		// consuming repo — the default cannot move to GitHub before that file
		// is there, or the pre-filled fields are silently dropped.
		expect(url).toContain('template=feature-request.yml')
		expect(url).toContain('title=%5BFEATURE%5D+Add+timeline+filter')
		const params = new URL(url).searchParams
		expect(params.get('problem')).toContain('I want to filter contacts by last interaction date')
		expect(params.get('proposed-solution')).toContain('date-range filter')
		expect(params.get('who-benefits')).toContain('Account managers')
		expect(params.get('priority-to-you')).toBe('Would use weekly')
		expect(params.get('context')).toContain('Avoid: hiding the filter behind a settings page.')
		expect(params.get('app')).toBe('pipelinq')
		expect(params.get('spec-ref')).toBe('client-management')
	})

	// Retains the coverage the test above used to provide. The Markdown-body
	// strategy is still live for Codeberg/Forgejo/Gitea; it is simply no longer
	// what the DEFAULT produces, so it is now exercised through an explicit
	// `forge` prop instead of by relying on the fleet default.
	it('an explicit Codeberg forge still submits a title + body Markdown deep-link', async () => {
		const wrapper = mount(CnSuggestFeatureModal, {
			stubs,
			propsData: {
				repo: 'Conduction/pipelinq',
				specRef: 'client-management',
				app: 'pipelinq',
				page: 'clients-index (/clients)',
				surface: 'contacts-list-sidebar',
				object: 'pipelinq · Client',
				forge: { type: 'codeberg' },
			},
		})
		await fillValid(wrapper)
		await wrapper.find('[data-label="Anything else?"] textarea').setValue('Avoid: hiding the filter behind a settings page.')
		await wrapper.findAll('.dialog-actions button.btn').at(2).trigger('click')

		expect(window.open).toHaveBeenCalledTimes(1)
		const url = window.open.mock.calls[0][0]
		expect(url).toMatch(/^https:\/\/codeberg\.org\/Conduction\/pipelinq\/issues\/new\?/)
		// Codeberg/Forgejo only supports title + body — no per-field params.
		expect(url).toContain('title=%5BFEATURE%5D+Add+timeline+filter')
		expect(url).not.toContain('template=')
		const body = decodeURIComponent(new URL(url).searchParams.get('body'))
		expect(body).toContain('## Problem')
		expect(body).toContain('I want to filter contacts by last interaction date')
		expect(body).toContain('## Proposed solution')
		expect(body).toContain('## Who benefits')
		expect(body).toContain('## How important is this to you?')
		expect(body).toContain('Would use weekly')
		expect(body).toContain('Avoid: hiding the filter behind a settings page.')
		// Context block.
		expect(body).toContain('**App:** pipelinq')
		expect(body).toContain('**Page:** clients-index (/clients)')
		expect(body).toContain('**Surface:** contacts-list-sidebar')
		expect(body).toContain('**Object:** pipelinq · Client')
		expect(body).toContain('**Spec ref:** client-management')

		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('Codeberg submit omits the context block + empty optional sections when no context given', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'Conduction/pipelinq' } })
		await fillValid(wrapper)
		await wrapper.findAll('.dialog-actions button.btn').at(2).trigger('click')
		const body = decodeURIComponent(new URL(window.open.mock.calls[0][0]).searchParams.get('body'))
		expect(body).not.toContain('---')
		expect(body).not.toContain('**App:**')
		expect(body).not.toContain('## Anything else?')
	})

	it('GitHub forge submit opens the Issue-Form deep-link with every structured field + context param pre-filled', async () => {
		const wrapper = mount(CnSuggestFeatureModal, {
			stubs,
			propsData: {
				repo: 'ConductionNL/pipelinq',
				forge: { type: 'github', baseUrl: 'https://github.com' },
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

	it('GitHub forge submit omits empty optional params from the URL', async () => {
		const wrapper = mount(CnSuggestFeatureModal, { stubs, propsData: { repo: 'ConductionNL/pipelinq', forge: { type: 'github' } } })
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
