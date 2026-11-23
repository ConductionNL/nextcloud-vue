/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-column-order-and-pinning/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const schema = {
	title: 'Purchase order',
	properties: {
		number: { type: 'string', title: 'Number', order: 1 },
		date: { type: 'string', title: 'Date', order: 2 },
		supplier: { type: 'string', title: 'Supplier', order: 3 },
		amount: { type: 'number', title: 'Amount', order: 4 },
	},
}
const stubs = {
	NcAppSidebar: { template: '<div><slot /></div>' },
	NcAppSidebarTab: { template: '<div><slot /></div>' },
	NcButton: { template: '<button v-bind="$attrs" :disabled="$attrs.disabled" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	NcCheckboxRadioSwitch: true,
	NcTextField: true,
	NcSelect: true,
	NcPopover: true,
	CnDateRangePicker: true,
	CnIcon: true,
}
function mountSidebar(props = {}) {
	return mount(CnIndexSidebar, {
		props: { open: true, schema, showMetadata: false, visibleColumns: ['number', 'date', 'supplier', 'amount'], ...props },
		global: { stubs },
	})
}
const items = (w) => w.findAll('[data-testid="cn-sidebar-columns-order-item"]')
const last = (w) => w.emitted('columns-reorder').at(-1)[0]

describe('CnIndexSidebar order and pin', () => {
	it('lists the visible columns in their order with Move up, Move down and Pin', () => {
		const w = mountSidebar()
		expect(items(w).map((i) => i.text())).toEqual(['Number', 'Date', 'Supplier', 'Amount'])
		expect(items(w)[2].find('[data-testid="cn-sidebar-columns-up"]').attributes('aria-label')).toBe('Move Supplier up')
		expect(items(w)[2].find('[data-testid="cn-sidebar-columns-down"]').attributes('aria-label')).toBe('Move Supplier down')
	})

	it('Move up twice puts Supplier first (the keyboard path)', async () => {
		let visible = ['number', 'date', 'supplier', 'amount']
		const w = mountSidebar({ visibleColumns: visible })
		await items(w)[2].get('[data-testid="cn-sidebar-columns-up"]').trigger('click')
		visible = last(w)
		await w.setProps({ visibleColumns: visible })
		await items(w)[1].get('[data-testid="cn-sidebar-columns-up"]').trigger('click')
		expect(last(w)).toEqual(['supplier', 'number', 'date', 'amount'])
	})

	it('drag calls the same method as the buttons', async () => {
		const w = mountSidebar()
		await items(w)[2].trigger('dragstart')
		await items(w)[0].trigger('drop')
		expect(last(w)).toEqual(['supplier', 'number', 'date', 'amount'])
	})

	it('disables Move up on the first column and Move down on the last', () => {
		const w = mountSidebar()
		expect(items(w)[0].get('[data-testid="cn-sidebar-columns-up"]').attributes('disabled')).toBeDefined()
		expect(items(w)[3].get('[data-testid="cn-sidebar-columns-down"]').attributes('disabled')).toBeDefined()
	})

	it('Pin carries aria-pressed, moves the column into the pinned block and reports the count', async () => {
		const w = mountSidebar()
		const pin = items(w)[2].get('[data-testid="cn-sidebar-columns-pin"]')
		expect(pin.attributes('aria-pressed')).toBe('false')
		await pin.trigger('click')
		expect(last(w)).toEqual(['supplier', 'number', 'date', 'amount'])
		expect(w.emitted('pin-change').at(-1)[0]).toBe(1)
	})

	it('a pinned column shows pressed, and Unpin leaves the block', async () => {
		const w = mountSidebar({ visibleColumns: ['supplier', 'number', 'date', 'amount'], pinnedCount: 1 })
		const pin = items(w)[0].get('[data-testid="cn-sidebar-columns-pin"]')
		expect(pin.attributes('aria-pressed')).toBe('true')
		expect(pin.attributes('aria-label')).toBe('Unpin Supplier')
		await pin.trigger('click')
		expect(w.emitted('pin-change').at(-1)[0]).toBe(0)
	})

	it('a column cannot be moved across the pinned boundary', async () => {
		const w = mountSidebar({ visibleColumns: ['supplier', 'number', 'date', 'amount'], pinnedCount: 1 })
		expect(items(w)[1].get('[data-testid="cn-sidebar-columns-up"]').attributes('disabled')).toBeDefined()
		w.vm.moveColumn(0, 3)
		expect(w.emitted('columns-reorder')).toBeUndefined()
	})

	it('Reset columns emits columns-reset', async () => {
		const w = mountSidebar()
		await w.get('[data-testid="cn-sidebar-columns-reset"]').trigger('click')
		expect(w.emitted('columns-reset')).toHaveLength(1)
	})

	it('with personalColumns off, no order controls', () => {
		const w = mountSidebar({ personalColumns: false })
		expect(w.find('[data-testid="cn-sidebar-columns-order"]').exists()).toBe(false)
	})

	it('with every column visible (null), the list starts from the default order', () => {
		const w = mountSidebar({ visibleColumns: null })
		expect(items(w).map((i) => i.text())).toEqual(['Number', 'Date', 'Supplier', 'Amount'])
	})
})
