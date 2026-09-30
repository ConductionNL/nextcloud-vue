/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import { reactive } from 'vue'

const mockStore = {
	registerObjectType: jest.fn(),
	saveObject: jest.fn(() => Promise.resolve({ id: 'cm-1', '@self': { id: 'cm-1' } })),
	fetchSchema: jest.fn(() => Promise.resolve(null)),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

import CnInteractionFormWidget from '../../src/components/CnInteractionFormWidget/CnInteractionFormWidget.vue'

describe('CnInteractionFormWidget', () => {
	const mount = (content = {}, workspace = {}) => {
		const holder = { value: workspace }
		const w = shallowMount(CnInteractionFormWidget, {
			propsData: { content },
			provide: { cnWorkspaceContext: holder },
		})
		return { w, holder }
	}

	beforeEach(() => {
		mockStore.saveObject.mockClear()
		mockStore.registerObjectType.mockClear()
		mockStore.fetchSchema.mockReset()
		mockStore.fetchSchema.mockImplementation(() => Promise.resolve(null))
	})

	it('offers the outcomes the schema allows, labelled and translated', async () => {
		mockStore.fetchSchema.mockImplementation(() => Promise.resolve({
			properties: {
				outcome: {
					enum: ['resolved', 'callbackRequest'],
					'x-enum-labels': { resolved: 'Resolved', callbackRequest: 'Callback request' },
				},
			},
		}))
		const w = shallowMount(CnInteractionFormWidget, {
			propsData: { content: { outcomes: [{ value: 'opgelost', label: 'Resolved' }] } },
			provide: {
				cnWorkspaceContext: { value: {} },
				cnTranslate: (key) => ({ Resolved: 'Opgelost', 'Callback request': 'Terugbelverzoek' }[key] || key),
			},
		})
		await flushPromises()

		expect(mockStore.fetchSchema).toHaveBeenCalledWith('pipelinq-contactmoment')
		expect(w.vm.outcomeOptions).toEqual([
			{ value: 'resolved', label: 'Opgelost' },
			{ value: 'callbackRequest', label: 'Terugbelverzoek' },
		])
	})

	it('falls back to content.outcomes when the schema has no outcome enum', async () => {
		const outcomes = [{ value: 'done', label: 'Done' }]
		const { w } = mount({ outcomes })
		await flushPromises()
		expect(w.vm.outcomeOptions).toEqual(outcomes)
	})

	it('names what it creates on the submit button when content.submitLabel is set', () => {
		const w = shallowMount(CnInteractionFormWidget, {
			propsData: { content: { submitLabel: 'Save contact moment' } },
			provide: {
				cnWorkspaceContext: { value: {} },
				cnTranslate: (key) => (key === 'Save contact moment' ? 'Contactmoment opslaan' : key),
			},
		})
		expect(w.vm.registerLabel).toBe('Contactmoment opslaan')
	})

	it('defaults the channel to the first configured channel', () => {
		const { w } = mount({ channels: [{ value: 'email', label: 'Email' }, { value: 'chat', label: 'Chat' }] })
		expect(w.vm.form.channel).toBe('email')
	})

	it('lists clients in the picker before anything is typed', () => {
		const w = shallowMount(CnInteractionFormWidget, {
			propsData: { content: {} },
			provide: { cnWorkspaceContext: { value: {} } },
			stubs: { CnFormWidgetBase: false },
		})
		const picker = w.findComponent({ name: 'CnResourceSelect' })
		expect(picker.exists()).toBe(true)
		expect(picker.props('preload')).toBe(true)
	})

	it('writes the chosen client and the live summary to the workspace by default', () => {
		const { w, holder } = mount({}, { selectedClient: 'c-page' })
		w.vm.onClientChange('c-7')
		w.vm.onFieldUpdate({ key: 'summary', value: 'router keeps dropping' })
		expect(holder.value.selectedClient).toBe('c-7')
		expect(holder.value.activeSummary).toBe('router keeps dropping')
	})

	it('keeps its client to the submission with writeWorkspace: false', () => {
		const { w, holder } = mount({ writeWorkspace: false }, { selectedClient: 'c-page' })
		w.vm.onClientChange('c-7')
		expect(w.vm.form.client).toBe('c-7')
		expect(holder.value.selectedClient).toBe('c-page')
	})

	it('pre-fills its client from the page client and follows it', async () => {
		const holder = reactive({ value: { selectedClient: 'c-1' } })
		const w = shallowMount(CnInteractionFormWidget, {
			propsData: { content: {} },
			provide: { cnWorkspaceContext: holder },
		})
		expect(w.vm.form.client).toBe('c-1')

		holder.value = { selectedClient: 'c-2' }
		await w.vm.$nextTick()
		expect(w.vm.form.client).toBe('c-2')
	})

	it('keeps the summary to the form with writeWorkspace: false', () => {
		const { w, holder } = mount({ writeWorkspace: false })
		w.vm.onFieldUpdate({ key: 'summary', value: 'router keeps dropping' })
		expect(w.vm.form.summary).toBe('router keeps dropping')
		expect(holder.value.activeSummary).toBeUndefined()
	})

	it('selects a newly-created client', () => {
		const { w, holder } = mount()
		w.vm.onClientCreated({ id: 'c-new', '@self': { id: 'c-new' } })
		expect(w.vm.form.client).toBe('c-new')
		expect(holder.value.selectedClient).toBe('c-new')
	})

	it('leaves an already-registered object type alone', async () => {
		mockStore.objectTypeRegistry = { 'pipelinq-contactmoment': {} }
		try {
			const { w } = mount()
			await flushPromises()
			w.vm.form.subject = 'Hi'
			await w.vm.onRegister()
			expect(mockStore.registerObjectType).not.toHaveBeenCalled()
		} finally {
			delete mockStore.objectTypeRegistry
		}
	})

	it('requires a subject before saving', async () => {
		const { w } = mount()
		w.vm.form.subject = '   '
		await w.vm.onRegister()
		expect(w.vm.subjectError).toBeTruthy()
		expect(mockStore.saveObject).not.toHaveBeenCalled()
	})

	it('persists a contactmoment with mapped fields and clears the summary', async () => {
		const { w, holder } = mount({ register: 'pipelinq', schema: 'contactmoment', summaryField: 'summary' })
		w.vm.form.subject = 'Callback'
		w.vm.form.channel = 'telefoon'
		w.vm.form.client = 'c-1'
		w.vm.form.summary = 'will call back'
		await w.vm.onRegister()
		expect(mockStore.saveObject).toHaveBeenCalledTimes(1)
		const [slug, payload] = mockStore.saveObject.mock.calls[0]
		expect(slug).toBe('pipelinq-contactmoment')
		expect(payload.subject).toBe('Callback')
		expect(payload.channel).toBe('telefoon')
		expect(payload.client).toBe('c-1')
		expect(payload.summary).toBe('will call back')
		expect(w.emitted().saved[0][0].id).toBe('cm-1')
		expect(w.vm.form.summary).toBe('')
		expect(holder.value.activeSummary).toBe('')
	})

	describe('after a save', () => {
		const mountForSave = (content) => shallowMount(CnInteractionFormWidget, {
			propsData: { content: { subjectField: 'title', ...content } },
			provide: { cnWorkspaceContext: { value: {} } },
			stubs: { CnFormWidgetBase: false },
			global: {
				mocks: {
					$router: {
						resolve: jest.fn(({ name, params }) => ({ href: `/apps/pipelinq/${name}/${params.id}` })),
					},
				},
			},
		})

		it('puts an Open button beside submit that opens the saved object in a new tab', async () => {
			const w = mountForSave({ detailRoute: 'TicketDetail' })
			expect(w.find('[data-testid="cn-interaction-form-open"]').exists()).toBe(false)

			w.vm.form.subject = 'Printer on fire'
			await w.vm.onRegister()
			await w.vm.$nextTick()

			const open = w.find('.cn-form-widget__actions [data-testid="cn-interaction-form-open"]')
			expect(open.exists()).toBe(true)
			expect(open.attributes('href')).toBe('/apps/pipelinq/TicketDetail/cm-1')
			expect(open.attributes('target')).toBe('_blank')
			expect(w.vm.openLabel).toContain('Printer on fire')
		})

		it('does not HTML-escape the saved title in the Open label', async () => {
			const w = mountForSave({ detailRoute: 'TicketDetail' })
			w.vm.form.subject = 'Q&A'
			await w.vm.onRegister()
			expect(w.vm.openLabel).toContain('Q&A')
			expect(w.vm.openLabel).not.toContain('&amp;')
		})

		it('shows no Open button when no detailRoute is set', async () => {
			const w = mountForSave({})
			w.vm.form.subject = 'Printer on fire'
			await w.vm.onRegister()
			await w.vm.$nextTick()

			expect(w.find('[data-testid="cn-interaction-form-open"]').exists()).toBe(false)
		})
	})

	it('honours custom field-name overrides in the payload', async () => {
		const { w } = mount({ subjectField: 'onderwerp', channelField: 'kanaal', clientField: 'klant' })
		w.vm.form.subject = 'Hi'
		w.vm.form.channel = 'email'
		w.vm.form.client = 'k-1'
		await w.vm.onRegister()
		const [, payload] = mockStore.saveObject.mock.calls[0]
		expect(payload.onderwerp).toBe('Hi')
		expect(payload.kanaal).toBe('email')
		expect(payload.klant).toBe('k-1')
	})

	// Vue 2.7's Options-API inject AUTO-UNWRAPS a provided ref, so in production
	// `cnWorkspaceContext` is the plain reactive object, NOT a `{ value }` holder.
	// These cover that real-world shape (the `.value` tests above cover the raw ref).
	describe('plain (Options-API auto-unwrapped) workspace holder', () => {
		const mountPlain = (workspace = {}) => {
			const bag = workspace
			const w = shallowMount(CnInteractionFormWidget, {
				propsData: { content: { writeWorkspace: false } },
				provide: { cnWorkspaceContext: bag },
			})
			return { w, bag }
		}

		it('pre-fills from a plain workspace object and never writes selectedClient', () => {
			const { w, bag } = mountPlain({ selectedClient: 'c-page' })
			expect(w.vm.form.client).toBe('c-page')
			w.vm.onClientChange('c-9')
			expect(bag.selectedClient).toBe('c-page')
		})

		it('writes selectedClient onto a plain workspace object by default', () => {
			const bag = {}
			const w = shallowMount(CnInteractionFormWidget, {
				propsData: { content: {} },
				provide: { cnWorkspaceContext: bag },
			})
			w.vm.onClientChange('c-9')
			expect(bag.selectedClient).toBe('c-9')
		})

		it('never writes activeSummary onto a plain workspace object', () => {
			const { w, bag } = mountPlain()
			w.vm.onFieldUpdate({ key: 'summary', value: 'reset password' })
			expect(bag.activeSummary).toBeUndefined()
		})
	})
})
