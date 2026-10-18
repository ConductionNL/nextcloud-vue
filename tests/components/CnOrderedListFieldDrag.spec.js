/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqPersoonlijkeInstellingen reorders the case types by a drag handle. Each row
 * has one: dragged onto another row it moves the row there, and as a button a
 * keyboard user moves the row with the arrow keys on it, focus staying on the
 * handle. The up and down buttons stay.
 */
import { mount } from '@vue/test-utils'
import CnOrderedListField from '../../src/components/CnOrderedListField/CnOrderedListField.vue'

const OPTIONS = [
	{ value: 'woo', label: 'Woo request' },
	{ value: 'objection', label: 'Objection' },
	{ value: 'permit', label: 'Environment permit' },
]

/**
 * Mount the field with three rows.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountList(props = {}) {
	return mount(CnOrderedListField, {
		props: { modelValue: ['woo', 'objection', 'permit'], options: OPTIONS, label: 'Case types in my menu', ...props },
		global: { stubs: { NcSelect: { name: 'NcSelect', template: '<div />' } } },
		attachTo: document.body,
	})
}

function lastValue(w) {
	const events = w.emitted('update:modelValue')
	return events[events.length - 1][0]
}

describe('CnOrderedListField drag to reorder', () => {
	it('draws a draggable handle button on every row, and keeps the up and down buttons', () => {
		const w = mountList()
		const handle = w.find('[data-testid="cn-ordered-list-handle-objection"]')
		expect(handle.element.tagName).toBe('BUTTON')
		expect(handle.attributes('draggable')).toBe('true')
		expect(handle.attributes('aria-label')).toContain('Objection')
		expect(w.find('[data-testid="cn-ordered-list-up-objection"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-ordered-list-down-objection"]').exists()).toBe(true)
		w.unmount()
	})

	it('moves a row dropped on another to that place', async () => {
		const w = mountList()
		await w.find('[data-testid="cn-ordered-list-handle-permit"]').trigger('dragstart')
		await w.find('[data-testid="cn-ordered-list-row-woo"]').trigger('dragover')
		expect(w.find('[data-testid="cn-ordered-list-row-woo"]').classes()).toContain('cn-ordered-list-field__row--over')
		await w.find('[data-testid="cn-ordered-list-row-woo"]').trigger('drop')
		expect(lastValue(w)).toEqual(['permit', 'woo', 'objection'])
		expect(w.find('.cn-ordered-list-field__row--over').exists()).toBe(false)
		w.unmount()
	})

	it('does nothing when a row is dropped on itself, or the drag ends outside', async () => {
		const w = mountList()
		await w.find('[data-testid="cn-ordered-list-handle-woo"]').trigger('dragstart')
		await w.find('[data-testid="cn-ordered-list-row-woo"]').trigger('drop')
		await w.find('[data-testid="cn-ordered-list-handle-woo"]').trigger('dragstart')
		await w.find('[data-testid="cn-ordered-list-handle-woo"]').trigger('dragend')
		expect(w.emitted('update:modelValue')).toBeUndefined()
		w.unmount()
	})

	it('moves the row with the arrow keys on its handle, keeping focus there', async () => {
		const w = mountList()
		const handle = w.find('[data-testid="cn-ordered-list-handle-objection"]')
		await handle.trigger('keydown', { key: 'ArrowUp' })
		expect(lastValue(w)).toEqual(['objection', 'woo', 'permit'])
		await w.setProps({ modelValue: lastValue(w) })
		await w.vm.$nextTick()
		expect(document.activeElement.getAttribute('data-testid')).toBe('cn-ordered-list-handle-objection')
		await w.find('[data-testid="cn-ordered-list-handle-objection"]').trigger('keydown', { key: 'ArrowDown' })
		expect(lastValue(w)).toEqual(['woo', 'objection', 'permit'])
		w.unmount()
	})

	it('draws no handle when the field is disabled', () => {
		const w = mountList({ disabled: true })
		expect(w.find('[data-testid="cn-ordered-list-handle-woo"]').exists()).toBe(false)
		w.unmount()
	})
})
