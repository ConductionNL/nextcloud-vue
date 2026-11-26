/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A label can be the heading of a group of app tiles ("Mijn apps").
 *
 * @spec openspec/changes/app-tile/specs/app-tile/spec.md
 */
import { mount } from '@vue/test-utils'
import CnLabelWidget from '../../src/components/CnLabelWidget/CnLabelWidget.vue'
import CnLabelWidgetForm from '../../src/components/CnLabelWidgetForm/CnLabelWidgetForm.vue'

jest.mock('@nextcloud/l10n', () => ({ translate: (app, text) => text }))

describe('CnLabelWidget as a tile group heading', () => {
	it('draws a heading without the inline style', () => {
		const wrapper = mount(CnLabelWidget, { props: { content: { text: 'Mijn apps', groupHeading: true, color: 'red' } } })
		const heading = wrapper.get('h2[data-testid="cn-label-widget-group"]')
		expect(heading.text()).toBe('Mijn apps')
		expect(heading.attributes('style')).toBeUndefined()
	})

	it('stays a plain label without the flag', () => {
		const wrapper = mount(CnLabelWidget, { props: { content: { text: 'Mijn apps' } } })
		expect(wrapper.find('h2').exists()).toBe(false)
		expect(wrapper.get('.cn-label-widget__text').text()).toBe('Mijn apps')
	})

	it('hides the style controls and emits the flag in the form', () => {
		const wrapper = mount(CnLabelWidgetForm, {
			props: { value: { text: 'Mijn apps' } },
			global: { stubs: { NcTextField: true, NcSelect: true, NcCheckboxRadioSwitch: true, CnColorPicker: true } },
		})
		expect(wrapper.findAll('ncselect-stub, nc-select-stub').length).toBe(2)
		wrapper.vm.updateField('groupHeading', true)
		expect(wrapper.emitted('update:content').at(-1)[0]).toMatchObject({ text: 'Mijn apps', groupHeading: true })
	})
})
