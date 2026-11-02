/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { mount } from '@vue/test-utils'
import CnDialogActions from '../../src/components/CnDialogActions/CnDialogActions.vue'

const cancel = (wrapper) => wrapper.find('[data-testid="cn-dialog-actions-cancel"]')
const submit = (wrapper) => wrapper.find('[data-testid="cn-dialog-actions-submit"]')

describe('CnDialogActions', () => {
	it('renders cancel and an enabled primary Save by default', () => {
		const wrapper = mount(CnDialogActions)
		expect(cancel(wrapper).text()).toBe('Cancel')
		expect(submit(wrapper).text()).toBe('Save')
		expect(submit(wrapper).attributes('variant')).toBe('primary')
		expect(submit(wrapper).attributes('disabled')).toBeUndefined()
		expect(wrapper.findComponent({ name: 'NcLoadingIcon' }).exists()).toBe(false)
	})

	it('uses the given labels, variant and icon', () => {
		const wrapper = mount(CnDialogActions, {
			propsData: { confirmLabel: 'Create', cancelLabel: 'Back', variant: 'error', confirmIcon: 'Plus' },
		})
		expect(cancel(wrapper).text()).toBe('Back')
		expect(submit(wrapper).text()).toBe('Create')
		expect(submit(wrapper).attributes('variant')).toBe('error')
		expect(wrapper.findComponent({ name: 'CnIcon' }).props('name')).toBe('Plus')
	})

	it('disables the primary button when the form cannot be submitted', () => {
		const wrapper = mount(CnDialogActions, { propsData: { canSubmit: false } })
		expect(submit(wrapper).attributes('disabled')).toBeDefined()
	})

	it('disables the primary button and draws a named loading icon while saving', () => {
		const wrapper = mount(CnDialogActions, { propsData: { saving: true, confirmIcon: 'Plus' } })
		expect(submit(wrapper).attributes('disabled')).toBeDefined()
		const spinner = wrapper.findComponent({ name: 'NcLoadingIcon' })
		expect(spinner.exists()).toBe(true)
		expect(spinner.attributes('name')).toBe('Loading\u00a0…')
		expect(wrapper.findComponent({ name: 'CnIcon' }).exists()).toBe(false)
	})

	it('emits cancel and submit from their buttons', async () => {
		const wrapper = mount(CnDialogActions)
		await cancel(wrapper).trigger('click')
		await submit(wrapper).trigger('click')
		expect(wrapper.emitted('cancel')).toHaveLength(1)
		expect(wrapper.emitted('submit')).toHaveLength(1)
	})
})
