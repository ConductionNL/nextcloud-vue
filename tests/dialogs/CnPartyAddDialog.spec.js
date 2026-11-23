/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPartyAddDialog: pick somebody known or describe somebody new, choose a
 * role, optionally the primary party. The dialog writes nothing; it emits the
 * choice and shows the host's refusal.
 *
 * @spec openspec/changes/object-parties-manage/specs/record-widgets/spec.md#requirement-the-parties-widget-can-add-and-remove-parties
 */
import { mount } from '@vue/test-utils'
import CnPartyAddDialog from '../../src/dialogs/CnPartyAddDialog.vue'

const ROLES = [{ key: 'chair', label: 'Voorzitter' }, { key: 'secretary', label: 'Secretaris' }]
const FIELDS = [{ key: 'givenNames', label: 'First names', required: true }, { key: 'surname', label: 'Last name', required: true }, { key: 'email', label: 'E-mail', type: 'email' }]

function mountDialog(props = {}) {
	return mount(CnPartyAddDialog, {
		props: { roles: ROLES, sources: [], createFields: FIELDS, allowPrimary: true, primaryLabel: 'Main contact', ...props },
		global: { stubs: { CnPartyPicker: { props: ['modelValue'], emits: ['update:modelValue'], template: '<div class="picker" />' } } },
	})
}

describe('CnPartyAddDialog', () => {
	it('sends nothing until a party and a role are chosen', async () => {
		const w = mountDialog()
		expect(w.find('[data-testid="cn-party-add-confirm"]').attributes('disabled')).toBeDefined()
		w.findComponent({ name: 'CnPartyPicker' }).vm.$emit('update:modelValue', 'p-kees')
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-party-add-confirm"]').attributes('disabled')).toBeDefined()
		w.vm.role = 'secretary'
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-party-add-confirm"]').attributes('disabled')).toBeUndefined()
	})

	it('emits somebody known in a role, as the primary party when chosen', async () => {
		const w = mountDialog()
		w.findComponent({ name: 'CnPartyPicker' }).vm.$emit('update:modelValue', 'p-kees')
		w.vm.role = 'chair'
		w.vm.primary = true
		await w.vm.$nextTick()
		await w.find('[data-testid="cn-party-add-confirm"]').trigger('click')
		expect(w.emitted('confirm')[0][0]).toEqual({ mode: 'existing', partyUuid: 'p-kees', values: {}, role: 'chair', primary: true })
	})

	it('describes somebody new with the declared fields, the required ones first', async () => {
		const w = mountDialog()
		w.vm.mode = 'new'
		w.vm.role = 'secretary'
		await w.vm.$nextTick()
		expect(w.findAll('[data-testid^="cn-party-add-field-"]')).toHaveLength(3)
		w.vm.setValue('givenNames', 'Kees')
		await w.vm.$nextTick()
		expect(w.vm.complete).toBe(false)
		w.vm.setValue('surname', 'de Wit')
		await w.vm.$nextTick()
		await w.find('[data-testid="cn-party-add-confirm"]').trigger('click')
		expect(w.emitted('confirm')[0][0]).toEqual({ mode: 'new', partyUuid: null, values: { givenNames: 'Kees', surname: 'de Wit' }, role: 'secretary', primary: false })
	})

	it('offers no new person and no primary choice when the host declares neither', () => {
		const w = mountDialog({ createFields: [], allowPrimary: false })
		expect(w.find('[data-testid="cn-party-add-mode-new"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-party-add-primary"]').exists()).toBe(false)
	})

	it('shows the host\'s refusal and lets the reader try again', async () => {
		const w = mountDialog()
		w.vm.fail('You may not change who is on this record.')
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-party-add-error"]').text()).toBe('You may not change who is on this record.')
		expect(w.vm.loading).toBe(false)
	})
})
