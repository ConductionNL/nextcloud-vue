/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFormPage local draft recovery and the Saving / Saved indicator
 * (opt-in through `recoverDraft`).
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(() => Promise.resolve({ data: {} })) } }))

import { mount } from '@vue/test-utils'
import CnFormPage from '@/components/CnFormPage/CnFormPage.vue'
import { draftKey, writeDraft } from '../../src/composables/useFormDraft.js'

const stubs = {
	CnPageHeader: true,
	NcButton: { template: '<button class="nc-button-stub" @click="$emit(\'click\')"><slot /></button>' },
	NcNoteCard: { template: '<div class="nc-note-stub"><slot /></div>' },
	NcLoadingIcon: true,
	Send: true,
	NcTextField: {
		template: '<input class="nc-textfield-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		props: ['label', 'modelValue', 'error', 'helperText', 'type'],
	},
}

const FIELDS = [{ key: 'name', type: 'text', label: 'Name' }]
const KEY = draftKey({ appId: 'survey', schema: 'intake', objectId: 'new', userId: 'anne' })

function mountForm(props = {}) {
	return mount(CnFormPage, {
		propsData: {
			fields: FIELDS,
			submitHandler: 'noop',
			recoverDraft: true,
			draftAppId: 'survey',
			draftUserId: 'anne',
			draftScope: 'intake',
			...props,
		},
		stubs,
		mocks: { $route: { params: {} }, $router: { push: jest.fn() } },
		provide: { cnCustomComponents: { noop: () => Promise.resolve() } },
	})
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnFormPage draft recovery', () => {
	beforeEach(() => {
		window.localStorage.clear()
		jest.useFakeTimers()
	})
	afterEach(() => jest.useRealTimers())

	it('is off by default: no indicator and nothing stored', async () => {
		const w = mountForm({ recoverDraft: false })
		await w.find('.nc-textfield-stub').setValue('Anne')
		jest.advanceTimersByTime(600)
		expect(w.find('[data-testid="cn-form-page-draft-state"]').exists()).toBe(false)
		expect(window.localStorage.getItem(KEY)).toBeNull()
	})

	it('moves the indicator from Saving to Saved as the draft lands', async () => {
		const w = mountForm()
		const state = () => w.find('[data-testid="cn-form-page-draft-state"]')
		expect(state().attributes('aria-live')).toBe('polite')
		expect(state().text()).toBe('')
		await w.find('.nc-textfield-stub').setValue('Anne')
		expect(state().text()).toBe('Saving')
		jest.advanceTimersByTime(600)
		await w.vm.$nextTick()
		expect(state().text()).toBe('Saved just now')
		expect(JSON.parse(window.localStorage.getItem(KEY)).values.name).toBe('Anne')
	})

	it('offers a stored draft and restores it only on request', async () => {
		writeDraft(KEY, { name: 'half getypt' })
		const w = mountForm()
		expect(w.find('[data-testid="cn-form-page-draft-offer"]').exists()).toBe(true)
		expect(w.vm.formData.name).toBeUndefined()
		await w.find('[data-testid="cn-form-page-draft-restore"]').trigger('click')
		expect(w.vm.formData.name).toBe('half getypt')
		expect(w.find('[data-testid="cn-form-page-draft-offer"]').exists()).toBe(false)
	})

	it('forgets the draft on Discard and offers none to another user', async () => {
		writeDraft(KEY, { name: 'x' })
		const other = mountForm({ draftUserId: 'bram' })
		expect(other.find('[data-testid="cn-form-page-draft-offer"]').exists()).toBe(false)
		const w = mountForm()
		await w.find('[data-testid="cn-form-page-draft-discard"]').trigger('click')
		expect(window.localStorage.getItem(KEY)).toBeNull()
	})

	it('clears the draft after a successful submit', async () => {
		jest.useRealTimers()
		const w = mountForm()
		await w.find('.nc-textfield-stub').setValue('Anne')
		writeDraft(KEY, { name: 'Anne' })
		await w.find('form').trigger('submit')
		await flush()
		expect(window.localStorage.getItem(KEY)).toBeNull()
	})
})
