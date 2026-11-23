/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A bulk action with `menu: true` sits under More in the selection strip and
 * in the bulk band (opencatalogi OcMassaActies: Lock, Unlock, Validate under
 * More), and emits the same payload as a button.
 *
 * @spec openspec/changes/bulk-actions-more-menu/specs/bulk-actions-more-menu/spec.md#requirement-a-bulk-action-can-sit-under-more
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcButton: { props: ['disabled'], template: '<button type="button" class="nc-button" :disabled="disabled"><slot name="icon" /><slot /></button>' },
	NcActions: { props: ['menuName'], template: '<div class="nc-actions" :data-menu-name="menuName"><slot /></div>' },
	NcActionButton: { emits: ['click'], template: '<button type="button" class="nc-action-button" @click="$emit(\'click\')"><slot /></button>' },
	CnBuildiqEditButton: true,
	CnIcon: true,
}

const actions = [
	{ id: 'publish', label: 'Publish' },
	{ id: 'lock', label: 'Lock', menu: true },
]

function mountBar(look) {
	return mount(CnActionsBar, {
		props: { selectable: true, selectedIds: ['a', 'b'], bulkActions: actions, showMassCopy: false, showMassDelete: false },
		global: { provide: look ? { cnLook: look } : {}, stubs },
	})
}

describe.each([
	['selection strip', null, '[data-testid="cn-selection-strip"]', 'cn-bulk-more'],
	['bulk band', 'board', '[data-testid="cn-bulk-band"]', 'cn-bulk-band-more'],
])('bulk actions under More in the %s', (_name, look, region, moreId) => {
	it('draws only the inline action as a button and the menu entry under More', () => {
		const w = mountBar(look)
		const bar = w.find(region)
		const buttons = bar.findAll('button.nc-button').map((b) => b.text())
		expect(buttons).toContain('Publish')
		expect(buttons).not.toContain('Lock')
		const more = bar.find(`[data-testid="${moreId}"]`)
		expect(more.exists()).toBe(true)
		expect(more.findAll('.nc-action-button').map((b) => b.text())).toEqual(['Lock'])
	})

	it('emits the bulk action with the selection from the menu', async () => {
		const w = mountBar(look)
		await w.find(`${region} [data-testid="${moreId}"] .nc-action-button`).trigger('click')
		expect(w.emitted('bulk-action').at(-1)).toEqual([{ id: 'lock', action: 'lock', selectedIds: ['a', 'b'], count: 2 }])
	})
})

it('draws no More menu without menu entries', () => {
	const w = mount(CnActionsBar, {
		props: { selectable: true, selectedIds: ['a'], bulkActions: [{ id: 'publish', label: 'Publish' }], showMassCopy: false, showMassDelete: false },
		global: { stubs },
	})
	expect(w.find('[data-testid="cn-bulk-more"]').exists()).toBe(false)
})
