/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * CnFormDialog writes a local draft only after a person changed a field, keys
 * it on the signed-in user, and shows a field's description once.
 *
 * Found in the round-6 cloud check of pipelinq: opening an edit dialog showed
 * "Saved just now" about 1.2 s later with no input, and stored a draft under a
 * key ending in `anonymous` although somebody was logged in. The next open
 * then offered that "draft", which held nothing anybody typed.
 *
 * 🔴 THE ASSERTIONS THAT CARRY THIS are the ones about OPENING. A test that
 * only types and reads the draft back passes on the old code too; the defect
 * was the dialog writing when nobody typed.
 *
 * @spec openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md
 */

jest.mock('@nextcloud/auth', () => ({
	...jest.requireActual('@nextcloud/auth'),
	getCurrentUser: jest.fn(() => null),
}))

import { getCurrentUser } from '@nextcloud/auth'
import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'
import { DRAFT_DEBOUNCE_MS, draftKey, writeDraft } from '@/composables/useFormDraft.js'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * An input that does what a real control does on mount: it reports its own
 * value back, normalised (null becomes ''). That echo is not somebody typing.
 */
const EchoingTextField = {
	name: 'NcTextField',
	props: ['modelValue', 'label', 'placeholder', 'error', 'type', 'disabled', 'labelOutside', 'helperText', 'loading'],
	emits: ['update:modelValue'],
	template: '<input class="echo-input" :data-label="label" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	mounted() {
		this.$emit('update:modelValue', (this.modelValue === null || this.modelValue === undefined) ? '' : String(this.modelValue))
	},
}

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcNoteCard: { template: '<div v-bind="$attrs"><slot /></div>' },
	NcLoadingIcon: true,
	NcTextField: EchoingTextField,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

const schema = {
	title: 'Task',
	slug: 'crmTask',
	properties: {
		title: { type: 'string', title: 'Title' },
		role: { type: 'string', title: 'Role', description: 'Job title or role in the organisation.' },
		notes: { type: 'string', title: 'Notes' },
	},
}

const item = { id: 't1', title: 'Call back', role: null, notes: '' }

/**
 * Mount the dialog.
 *
 * @param {object} [props] Props over the defaults.
 * @return {object} The wrapper.
 */
function open(props = {}) {
	return mount(CnFormDialog, {
		props: { schema, item, draftAppId: 'pipelinq', ...props },
		global: { stubs },
	})
}

/**
 * The stubbed input of one field, found by its label.
 *
 * @param {object} wrapper The dialog wrapper.
 * @param {string} label The start of the field's label.
 * @return {object} The input wrapper.
 */
const inputFor = (wrapper, label) => wrapper.findAll('.echo-input').find((i) => String(i.attributes('data-label') || '').startsWith(label))

const indicator = (wrapper) => wrapper.find('[data-testid="cn-form-dialog-draft-state"]').text()
const storedDraftKeys = () => Object.keys(window.localStorage).filter((k) => k.startsWith('cn-form-draft:'))

beforeEach(() => {
	window.localStorage.clear()
	getCurrentUser.mockReturnValue({ uid: 'cluade', displayName: 'Cluade', isAdmin: false })
})

describe('opening an edit dialog', () => {
	it('writes no draft and announces nothing when nobody typed', async () => {
		const wrapper = open()
		await flushPromises()
		// The form normalising its own data after it was seeded: a value the
		// dialog fills in by itself, the way async defaults land.
		wrapper.vm.formData.notes = null
		await wrapper.vm.$nextTick()
		await wait(DRAFT_DEBOUNCE_MS + 200)

		// 🔴 THE DEFECT. The old dialog wrote here and said "Saved just now".
		expect(storedDraftKeys()).toEqual([])
		expect(indicator(wrapper)).toBe('')
		expect(wrapper.vm.draftState).toBe('idle')
	})

	it('writes the draft once a person changes a field, and says so', async () => {
		// The control: without it, "nothing stored" above could mean drafts
		// never work at all.
		const wrapper = open()
		await flushPromises()
		await inputFor(wrapper, 'Title').setValue('Call back tomorrow')

		expect(indicator(wrapper)).toBe('Saving')
		await wait(DRAFT_DEBOUNCE_MS + 200)

		expect(indicator(wrapper)).toBe('Saved just now')
		const key = draftKey({ appId: 'pipelinq', schema: 'crmTask', objectId: 't1', userId: 'cluade' })
		expect(JSON.parse(window.localStorage.getItem(key)).values.title).toBe('Call back tomorrow')
	})

	it('drops the draft again when the change is undone', async () => {
		const wrapper = open()
		await flushPromises()
		const input = inputFor(wrapper, 'Title')
		await input.setValue('Call back tomorrow')
		await wait(DRAFT_DEBOUNCE_MS + 200)
		expect(storedDraftKeys()).toHaveLength(1)

		await input.setValue('Call back')
		await wait(DRAFT_DEBOUNCE_MS + 200)

		// Back to what the record says: there is nothing to recover.
		expect(storedDraftKeys()).toEqual([])
		expect(indicator(wrapper)).toBe('')
	})

	it('treats an empty input and a missing value as the same, so clearing an empty field is no change', async () => {
		const wrapper = open()
		await flushPromises()
		// `role` is null on the record; the input shows '' and reports ''.
		wrapper.vm.updateField('role', '')
		await wait(DRAFT_DEBOUNCE_MS + 200)

		expect(storedDraftKeys()).toEqual([])
	})
})

describe('whose draft it is', () => {
	it('keys the draft on the signed-in user when the host passes no user', async () => {
		const wrapper = open()
		await flushPromises()
		await inputFor(wrapper, 'Title').setValue('Call back tomorrow')
		await wait(DRAFT_DEBOUNCE_MS + 200)

		// 🔴 The old key ended in `anonymous` for everybody on the device.
		expect(storedDraftKeys()).toEqual(['cn-form-draft:pipelinq:crmTask:t1:cluade'])
	})

	it('keeps an explicit draftUserId over the signed-in user', async () => {
		const wrapper = open({ draftUserId: 'anne' })
		await flushPromises()
		await inputFor(wrapper, 'Title').setValue('Call back tomorrow')
		await wait(DRAFT_DEBOUNCE_MS + 200)

		expect(storedDraftKeys()).toEqual(['cn-form-draft:pipelinq:crmTask:t1:anne'])
	})

	it('never offers a draft stored under anonymous to a signed-in user, and removes it', async () => {
		// Written by an older version for whoever used this browser before.
		const anonymousKey = draftKey({ appId: 'pipelinq', schema: 'crmTask', objectId: 't1', userId: '' })
		const otherForm = draftKey({ appId: 'pipelinq', schema: 'lead', objectId: 'l1', userId: '' })
		writeDraft(anonymousKey, { title: 'typed by somebody else' })
		writeDraft(otherForm, { title: 'typed by somebody else' })

		const wrapper = open()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(false)
		expect(window.localStorage.getItem(anonymousKey)).toBeNull()
		expect(window.localStorage.getItem(otherForm)).toBeNull()
	})

	it('leaves another user\'s own draft alone', async () => {
		const annesKey = draftKey({ appId: 'pipelinq', schema: 'crmTask', objectId: 't1', userId: 'anne' })
		writeDraft(annesKey, { title: 'van anne' })

		const wrapper = open()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(false)
		expect(window.localStorage.getItem(annesKey)).not.toBeNull()
	})

	it('falls back to anonymous when nobody is signed in, and still offers that draft', async () => {
		getCurrentUser.mockReturnValue(null)
		const anonymousKey = draftKey({ appId: 'pipelinq', schema: 'crmTask', objectId: 't1', userId: '' })
		writeDraft(anonymousKey, { title: 'half getypt' })

		const wrapper = open()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(true)
	})
})

describe('a description shown once', () => {
	it('drops the placeholder when the help line under the field says the same', async () => {
		const wrapper = open()
		await flushPromises()

		const roleInput = inputFor(wrapper, 'Role')
		// The help line stays: it is still there after somebody typed, and the
		// input names it through aria-describedby.
		expect(wrapper.text()).toContain('Job title or role in the organisation.')
		// 🔴 The old dialog also put it in the placeholder, so it showed twice.
		expect(roleInput.attributes('placeholder') || '').toBe('')
	})

	it('keeps the description as the placeholder while an error takes the help line', async () => {
		const wrapper = open()
		await flushPromises()
		wrapper.vm.errors = { ...wrapper.vm.errors, role: 'Too long.' }
		await wrapper.vm.$nextTick()

		const roleInput = inputFor(wrapper, 'Role')
		expect(roleInput.attributes('placeholder')).toBe('Job title or role in the organisation.')
	})
})
