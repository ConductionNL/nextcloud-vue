/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppTilesWidgetForm: title, pinned apps and the two switches of an
 * `app-tiles` placement, keeping the keys it does not edit.
 *
 * @spec openspec/changes/lpvandaag-start-page/specs/lpvandaag-start-page/spec.md#requirement-the-apps-a-person-can-open-are-tiles
 */
import { mount } from '@vue/test-utils'
import CnAppTilesWidgetForm from '../../src/components/CnAppTilesWidgetForm/CnAppTilesWidgetForm.vue'

jest.mock('@nextcloud/l10n', () => ({ translate: (app, text) => text }))

const stubs = {
	NcTextField: { name: 'NcTextField', props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
	NcCheckboxRadioSwitch: { name: 'NcCheckboxRadioSwitch', props: ['modelValue'], emits: ['update:modelValue'], template: '<button class="switch" @click="$emit(\'update:modelValue\', !modelValue)"><slot /></button>' },
}

describe('CnAppTilesWidgetForm', () => {
	it('reads an edited placement and emits the content with the pins as a list', async () => {
		const wrapper = mount(CnAppTilesWidgetForm, {
			props: { editingWidget: { content: { title: 'Apps', pinned: ['files'], status: { mail: 'down' } } } },
			global: { stubs },
		})
		const inputs = wrapper.findAll('input')
		expect(inputs[1].element.value).toBe('files')
		await inputs[1].setValue('files, calendar ,')
		const content = wrapper.emitted('update:content').at(-1)[0]
		expect(content.pinned).toEqual(['files', 'calendar'])
		expect(content.status).toEqual({ mail: 'down' })
		expect(content.showFilter).toBe(true)
		await wrapper.findAll('.switch')[0].trigger('click')
		expect(wrapper.emitted('update:content').at(-1)[0].showFilter).toBe(false)
		expect(wrapper.vm.validate()).toEqual([])
	})

	it('starts with the title Apps in create mode', () => {
		const wrapper = mount(CnAppTilesWidgetForm, { global: { stubs } })
		expect(wrapper.findAll('input')[0].element.value).toBe('Apps')
	})
})
