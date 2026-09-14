/**
 * Tests for CnFormDialog's Nextcloud user-picker support.
 *
 * A schema property marked as a Nextcloud user (`referenceType: 'nextcloud-user'`
 * or `format: 'user'`/`'username'`) renders as a searchable dropdown of real
 * Nextcloud users (label = display name, value = UID) instead of a free-text
 * box. The stored value remains the UID string (single) or array of UIDs.
 */

import { mount } from '@vue/test-utils'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	__esModule: true,
	searchNextcloudUsers: jest.fn().mockResolvedValue([
		{ id: 'annemarie', label: 'Annemarie de Vries', subline: '' },
		{ id: 'henk', label: 'Henk Bakker', subline: '' },
	]),
	resolveNextcloudUser: jest.fn().mockResolvedValue({ id: 'henk', label: 'Henk Bakker' }),
}))

import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
// Import AFTER the mock is registered.
import { resolveNextcloudUser, searchNextcloudUsers } from '../../src/utils/userAutocomplete.js'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcSelectUsers: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

const userSchema = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title', order: 1 },
		assignee: { type: 'string', referenceType: 'nextcloud-user', title: 'Assignee', order: 2 },
		watchers: { type: 'array', items: { referenceType: 'nextcloud-user' }, title: 'Watchers', order: 3 },
	},
	required: ['title', 'assignee'],
}

beforeEach(() => {
	searchNextcloudUsers.mockClear()
	resolveNextcloudUser.mockClear()
})

describe('CnFormDialog — Nextcloud user picker', () => {
	it('renders a single user field as the user picker widget', () => {
		const wrapper = mount(CnFormDialog, { propsData: { schema: userSchema, item: null }, stubs })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'assignee')
		expect(field.widget).toBe('user')
		expect(wrapper.vm.isUserField(field)).toBe(true)
	})

	it('loads {label,value} options from the autocomplete endpoint', async () => {
		const wrapper = mount(CnFormDialog, { propsData: { schema: userSchema, item: null }, stubs })
		await flushPromises()
		expect(searchNextcloudUsers).toHaveBeenCalled()
		const options = wrapper.vm.getEffectiveOptions(wrapper.vm.resolvedFields.find((f) => f.key === 'assignee'))
		expect(options).toEqual([
			{ id: 'annemarie', label: 'Annemarie de Vries', subline: '' },
			{ id: 'henk', label: 'Henk Bakker', subline: '' },
		])
	})

	it('stores the chosen UID (not the option object) on select', () => {
		const wrapper = mount(CnFormDialog, { propsData: { schema: userSchema, item: null }, stubs })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'assignee')
		wrapper.vm.onEffectiveSelectChange(field, { id: 'annemarie', label: 'Annemarie de Vries' })
		expect(wrapper.vm.formData.assignee).toBe('annemarie')
	})

	it('preserves the UID in the submit payload', () => {
		const wrapper = mount(CnFormDialog, { propsData: { schema: userSchema, item: null }, stubs })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'assignee')
		wrapper.vm.updateField('title', 'My case')
		wrapper.vm.onEffectiveSelectChange(field, { id: 'annemarie', label: 'Annemarie de Vries' })
		const payload = wrapper.vm.buildSubmitPayload()
		expect(payload.assignee).toBe('annemarie')
	})

	it('resolves a stored UID to its display-name label in edit mode', async () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema: userSchema, item: { id: '1', title: 'Edit', assignee: 'henk' } },
			stubs,
		})
		await flushPromises()
		expect(resolveNextcloudUser).toHaveBeenCalledWith('henk')
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'assignee')
		const selected = wrapper.vm.getEffectiveSelectedOption(field)
		expect(selected).toEqual({ id: 'henk', label: 'Henk Bakker' })
		// Stored value is still the UID.
		expect(wrapper.vm.formData.assignee).toBe('henk')
	})

	it('stores an array of UIDs for a multi-value user field', () => {
		const wrapper = mount(CnFormDialog, { propsData: { schema: userSchema, item: null }, stubs })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'watchers')
		expect(field.widget).toBe('user-multiselect')
		expect(wrapper.vm.isUserArrayField(field)).toBe(true)
		wrapper.vm.onEffectiveMultiSelectChange(field, [
			{ id: 'annemarie', label: 'Annemarie de Vries' },
			{ id: 'henk', label: 'Henk Bakker' },
		])
		expect(wrapper.vm.formData.watchers).toEqual(['annemarie', 'henk'])
	})

	// WHICH COMPONENT RENDERS, not merely that a select does.
	//
	// A user field used to be an NcSelect carrying `:user-select="true"`.
	// @nextcloud/vue 9 REMOVED that prop, so the flag was silently dropped and a
	// user field became an ordinary select: no avatars, no user styling. Nothing
	// failed, because nothing asserted which component was mounted.
	it('renders a user field as NcSelectUsers, and an ordinary select as NcSelect', () => {
		const wrapper = mount(CnFormDialog, { propsData: { schema: userSchema, item: null }, stubs })
		expect(wrapper.findComponent({ name: 'NcSelectUsers' }).exists()).toBe(true)
	})

	it('leaves a non-user select as NcSelect', () => {
		const plain = {
			title: 'Case',
			properties: { status: { type: 'string', title: 'Status', enum: ['open', 'closed'] } },
		}
		const wrapper = mount(CnFormDialog, { propsData: { schema: plain, item: null }, stubs })
		expect(wrapper.findComponent({ name: 'NcSelectUsers' }).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'NcSelect' }).exists()).toBe(true)
	})
})
