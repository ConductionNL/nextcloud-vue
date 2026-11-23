/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `v-cn-select-aria` puts the form's aria attributes on the NcSelect search
 * input, because NcSelect forwards no attributes there (screens-form-parity
 * task 3). CnFormPage and CnFormDialog use it for their select fields.
 *
 * @spec openspec/changes/screens-form-parity/tasks.md
 */
import { mount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import { cnSelectAria } from '../../src/directives/cnSelectAria.js'

// Same markup shape as the real NcSelect: attributes fall through to the root
// div, the combobox input sits inside.
const SelectStub = {
	template: '<div class="v-select"><input class="vs__search" /></div>',
	props: ['inputLabel', 'inputId', 'options', 'modelValue', 'labelOutside', 'disabled', 'multiple', 'clearable', 'loading', 'filterable', 'keepOpen', 'taggable'],
}

const Host = {
	directives: { cnSelectAria },
	components: { SelectStub },
	props: { aria: { type: Object, default: null } },
	template: '<SelectStub v-cn-select-aria="aria" />',
}

describe('v-cn-select-aria', () => {
	it('sets the attributes on the input, not on the wrapper', () => {
		const w = mount(Host, { props: { aria: { 'aria-invalid': 'true', 'aria-describedby': 'e h', 'aria-required': 'true' } } })
		const input = w.find('input')
		expect(input.attributes('aria-invalid')).toBe('true')
		expect(input.attributes('aria-describedby')).toBe('e h')
		expect(input.attributes('aria-required')).toBe('true')
		expect(w.find('.v-select').attributes('aria-invalid')).toBeUndefined()
	})

	it('removes an attribute that goes away', async () => {
		const w = mount(Host, { props: { aria: { 'aria-invalid': 'true', 'aria-describedby': 'e' } } })
		await w.setProps({ aria: { 'aria-invalid': null, 'aria-describedby': null } })
		expect(w.find('input').attributes('aria-invalid')).toBeUndefined()
		expect(w.find('input').attributes('aria-describedby')).toBeUndefined()
	})

	it('does nothing for a null value', () => {
		const w = mount(Host, { props: { aria: null } })
		expect(w.find('input').attributes('aria-invalid')).toBeUndefined()
	})
})

describe('CnFormPage enum field', () => {
	const mountPage = (look) => mount(CnFormPage, {
		props: {
			submitHandler: 'x',
			fields: [{ key: 'role', type: 'enum', label: 'Role', enum: ['admin', 'user'], help: 'Pick one.', validation: { required: true } }],
		},
		global: {
			stubs: { CnPageHeader: true, NcButton: true, NcLoadingIcon: true, Send: true, NcSelect: SelectStub },
			provide: look ? { cnLook: 'board' } : {},
			mocks: { $route: { params: {} } },
		},
	})

	it.each([false, true])('wires the combobox input to the error and hint (board look %s)', async (look) => {
		const w = mountPage(look)
		expect(w.find('input').attributes('aria-invalid')).toBeUndefined()
		w.vm.fieldErrors = { role: 'Choose a role' }
		await w.vm.$nextTick()
		const input = w.find('[data-field-key="role"] input')
		expect(input.attributes('aria-invalid')).toBe('true')
		const ids = input.attributes('aria-describedby').split(' ')
		expect(ids).toEqual(['cn-form-page__field-error-role', 'cn-form-page__field-help-role'])
		ids.forEach((id) => expect(w.find(`#${id}`).exists()).toBe(true))
		expect(input.attributes('aria-required')).toBe(look ? 'true' : undefined)
		// clears once valid
		w.vm.fieldErrors = {}
		await w.vm.$nextTick()
		expect(w.find('[data-field-key="role"] input').attributes('aria-invalid')).toBeUndefined()
	})
})

describe('CnFormDialog select, multiselect and tags fields', () => {
	const schema = {
		title: 'Decision',
		properties: {
			kind: { type: 'string', title: 'Kind', enum: ['a', 'b'], description: 'Pick.' },
			labels: { type: 'array', title: 'Labels', items: { type: 'string', enum: ['x', 'y'] } },
			tags: { type: 'array', title: 'Tags', items: { type: 'string' }, widget: 'tags' },
		},
		required: ['kind'],
	}

	it.each([false, true])('lists the error on every select input (board look %s)', async (look) => {
		const w = mount(CnFormDialog, {
			props: { schema, item: null },
			global: { stubs: { NcSelect: SelectStub }, provide: look ? { cnLook: 'board' } : {} },
		})
		w.vm.errors = { kind: 'Required', labels: 'Too few', tags: 'Bad tag' }
		await w.vm.$nextTick()
		for (const key of ['kind', 'labels', 'tags']) {
			const input = w.find(`[data-cn-field="${key}"] input`)
			expect(input.exists()).toBe(true)
			expect(input.attributes('aria-invalid')).toBe('true')
			expect(input.attributes('aria-describedby')).toBeTruthy()
		}
	})
})
