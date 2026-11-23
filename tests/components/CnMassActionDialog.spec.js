/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { mount } from '@vue/test-utils'
import { markRaw } from 'vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import { CnMassActionDialog } from '../../src/components/CnMassActionDialog/index.js'
import { CnMassDeleteDialog } from '../../src/components/CnMassDeleteDialog/index.js'

const items = [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }]
const confirmButton = (wrapper) => wrapper.find('[data-testid="cn-mass-action-dialog-confirm"]')

describe('CnMassActionDialog', () => {
	it('defaults to a neutral primary action without an icon', () => {
		const wrapper = mount(CnMassActionDialog, { propsData: { items } })
		expect(wrapper.find('[data-testid-modal="cn-mass-action-dialog"]').exists()).toBe(true)
		expect(confirmButton(wrapper).attributes('variant')).toBe('primary')
		expect(confirmButton(wrapper).text()).toBe('Confirm')
		expect(wrapper.find('.stub.NcDialog').attributes('name')).toBe('Confirm action')
		expect(wrapper.text()).toContain('The action applies to the following items. Remove any items you want to leave out.')
		expect(confirmButton(wrapper).find('.material-design-icon').exists()).toBe(false)
	})

	it('draws the variant and a named CnIcon on the primary button', () => {
		const wrapper = mount(CnMassActionDialog, {
			propsData: { items, variant: 'warning', confirmIcon: 'Publish', confirmLabel: 'Publish' },
		})
		expect(confirmButton(wrapper).attributes('variant')).toBe('warning')
		expect(confirmButton(wrapper).text()).toBe('Publish')
		expect(wrapper.findComponent({ name: 'CnIcon' }).props('name')).toBe('Publish')
	})

	it('draws an icon component on the primary button', () => {
		const wrapper = mount(CnMassActionDialog, { propsData: { items, confirmIcon: markRaw(LockOutline) } })
		expect(confirmButton(wrapper).find('.lock-outline-icon').exists()).toBe(true)
	})

	it('emits the ids still on the list and shows the generic empty text', async () => {
		const wrapper = mount(CnMassActionDialog, { propsData: { items } })
		await wrapper.find('.cn-mass-delete__item .stub.NcButton').trigger('click')
		await confirmButton(wrapper).trigger('click')
		expect(wrapper.emitted('confirm')).toEqual([[['b']]])

		const empty = mount(CnMassActionDialog, { propsData: { items: [] } })
		expect(empty.text()).toContain('No items selected.')
		expect(confirmButton(empty).attributes('disabled')).toBeDefined()
	})

	it('reports the generic success text', async () => {
		jest.useFakeTimers()
		const wrapper = mount(CnMassActionDialog, { propsData: { items } })
		wrapper.vm.setResult({ success: true })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid-phase="result"]').text()).toBe('Done.')
		jest.advanceTimersByTime(2000)
		expect(wrapper.emitted('close')).toBeTruthy()
		jest.useRealTimers()
	})

	it('builds the board sentence from the sentence prop, reversible by default', () => {
		const wrapper = mount(CnMassActionDialog, {
			propsData: { items, look: 'board', sentence: 'Lock {count} now?' },
		})
		const sentence = wrapper.find('[data-testid="cn-mass-action-sentence"]')
		expect(sentence.text()).toBe('Lock 2 items now?')
		expect(sentence.find('strong').text()).toBe('2 items')
		expect(wrapper.find('[data-testid="cn-mass-action-note"]').exists()).toBe(true)

		const irreversible = mount(CnMassActionDialog, { propsData: { items, look: 'board', irreversible: true } })
		expect(irreversible.find('[data-testid="cn-mass-action-sentence"]').text())
			.toBe('Are you sure you want to continue with 2 items? This action cannot be undone.')
	})
})

describe('CnMassDeleteDialog as a preset of CnMassActionDialog', () => {
	it('keeps its own name, test ids and delete defaults', () => {
		const wrapper = mount(CnMassDeleteDialog, { propsData: { items } })
		expect(CnMassDeleteDialog.name).toBe('CnMassDeleteDialog')
		expect(CnMassDeleteDialog.extends).toBe(CnMassActionDialog)
		const button = wrapper.find('[data-testid="cn-mass-delete-dialog-confirm"]')
		expect(button.attributes('variant')).toBe('error')
		expect(button.find('.trash-can-outline-icon').exists()).toBe(true)
	})

	it('accepts the action props', () => {
		const wrapper = mount(CnMassDeleteDialog, {
			propsData: { items, variant: 'warning', confirmIcon: 'Archive', confirmLabel: 'Purge' },
		})
		const button = wrapper.find('[data-testid="cn-mass-delete-dialog-confirm"]')
		expect(button.attributes('variant')).toBe('warning')
		expect(button.text()).toBe('Purge')
		expect(wrapper.findComponent({ name: 'CnIcon' }).props('name')).toBe('Archive')
	})
})
