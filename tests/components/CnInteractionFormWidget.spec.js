/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'

const mockStore = {
	registerObjectType: jest.fn(),
	saveObject: jest.fn(() => Promise.resolve({ id: 'cm-1', '@self': { id: 'cm-1' } })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// eslint-disable-next-line import/first
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
	})

	it('defaults the channel to the first configured channel', () => {
		const { w } = mount({ channels: [{ value: 'email', label: 'Email' }, { value: 'chat', label: 'Chat' }] })
		expect(w.vm.form.channel).toBe('email')
	})

	it('writes selectedClient into the workspace context on client change', () => {
		const { w, holder } = mount()
		w.vm.onClientChange('c-7')
		expect(holder.value.selectedClient).toBe('c-7')
		expect(w.vm.form.client).toBe('c-7')
	})

	it('streams the summary into the workspace context (activeSummary)', () => {
		const { w, holder } = mount()
		// The summary edit now arrives through CnFormWidgetBase's `update:field`
		// (one keyed handler replaced the per-control ones), so the test drives
		// the same path the base does.
		w.vm.onFieldUpdate({ key: 'summary', value: 'router keeps dropping' })
		expect(holder.value.activeSummary).toBe('router keeps dropping')
	})

	it('selects a newly-created client', () => {
		const { w, holder } = mount()
		w.vm.onClientCreated({ id: 'c-new', '@self': { id: 'c-new' } })
		expect(w.vm.form.client).toBe('c-new')
		expect(holder.value.selectedClient).toBe('c-new')
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
		// summary reset + workspace cleared
		expect(w.vm.form.summary).toBe('')
		expect(holder.value.activeSummary).toBe('')
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
				propsData: { content: {} },
				provide: { cnWorkspaceContext: bag },
			})
			return { w, bag }
		}

		it('writes selectedClient onto a plain workspace object', () => {
			const { w, bag } = mountPlain()
			w.vm.onClientChange('c-9')
			expect(bag.selectedClient).toBe('c-9')
		})

		it('streams activeSummary onto a plain workspace object', () => {
			const { w, bag } = mountPlain()
			w.vm.onFieldUpdate({ key: 'summary', value: 'reset password' })
			expect(bag.activeSummary).toBe('reset password')
		})
	})
})
