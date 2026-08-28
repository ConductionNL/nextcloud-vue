/**
 * Tests for CnCardGrid's `clickToView` prop — the card-grid counterpart of
 * CnIndexPage's `rowClickToView`: a body click on a SELECTABLE card emits
 * `click` (navigation) instead of toggling selection, and the checkbox stays
 * the only selection surface. Mirrors the table, where a row click already
 * navigates in that mode.
 */
import { mount } from '@vue/test-utils'
import CnCardGrid from '../../src/components/CnCardGrid/CnCardGrid.vue'

const stubs = {
	NcCheckboxRadioSwitch: {
		template: '<input type="checkbox" class="nc-checkbox-stub" @change="$emit(\'update:model-value\', true)" />',
		props: ['modelValue'],
	},
	NcLoadingIcon: { template: '<div />' },
	NcEmptyContent: { template: '<div><slot /></div>' },
}

const objects = [{ id: 's1', name: 'Alpha' }]

describe('CnCardGrid — clickToView', () => {
	it('emits click (navigation) on a selectable card body when clickToView is set', async () => {
		const wrapper = mount(CnCardGrid, {
			propsData: { objects, selectable: true, clickToView: true, rowKey: 'id' },
			stubs,
		})
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('click')).toBeTruthy()
		expect(wrapper.emitted('click')[0][0]).toMatchObject({ id: 's1' })
		expect(wrapper.emitted('select')).toBeFalsy()
	})

	it('still selects via the checkbox when clickToView is set', async () => {
		const wrapper = mount(CnCardGrid, {
			propsData: { objects, selectable: true, clickToView: true, rowKey: 'id' },
			stubs,
		})
		await wrapper.find('.cn-object-card__checkbox input').trigger('change')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('select')[0][0]).toEqual(['s1'])
	})

	it('keeps the legacy select-on-body-click without clickToView', async () => {
		const wrapper = mount(CnCardGrid, {
			propsData: { objects, selectable: true, rowKey: 'id' },
			stubs,
		})
		await wrapper.find('.cn-object-card').trigger('mousedown')
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('click')).toBeFalsy()
	})
})
