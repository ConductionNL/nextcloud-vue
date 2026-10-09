/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The bulk band under the board look: its own region outside the toolbar,
 * only while rows are selected, with a lead, the bulk actions and a hint.
 *
 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-bulk-band-is-its-own-row
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = { NcButton: { template: '<button type="button" v-bind="$attrs"><slot /></button>' }, NcActions: true, CnBuildiqEditButton: true }
const BULK = [{ id: 'assign', label: 'Assign' }, { id: 'status', label: 'Change status' }]

function mountBar(props = {}, look = 'board') {
	return mount(CnActionsBar, {
		props: { selectable: true, selectedIds: ['a', 'b', 'c'], bulkActions: BULK, showMassCopy: false, showMassDelete: false, ...props },
		global: { provide: { cnLook: look }, stubs },
	})
}

describe('CnActionsBar bulk band (board look)', () => {
	it('renders the band as a named region outside the toolbar with a lead and the actions', () => {
		const wrapper = mountBar({ bulkNoun: 'cases', bulkHint: 'See what changes first' })
		const band = wrapper.find('[data-testid="cn-bulk-band"]')
		expect(band.exists()).toBe(true)
		expect(band.attributes('role')).toBe('region')
		expect(band.attributes('aria-label')).toBe('Actions for the selection')
		expect(band.element.closest('.cn-actions-bar')).toBeNull()
		expect(band.find('strong').text()).toBe('With the selected cases')
		expect(band.findAll('button').map((b) => b.text())).toEqual(['Assign', 'Change status'])
		expect(band.find('[data-testid="cn-bulk-band-hint"]').text()).toBe('See what changes first')
		expect(wrapper.find('[data-testid="cn-selection-strip"]').exists()).toBe(false)
	})

	it('names "items" without a plural and renders no hint without one', () => {
		const wrapper = mountBar()
		expect(wrapper.find('[data-testid="cn-bulk-band"] strong').text()).toBe('With the selected items')
		expect(wrapper.find('[data-testid="cn-bulk-band-hint"]').exists()).toBe(false)
	})

	it('renders only while rows are selected, and keeps the live region', () => {
		const wrapper = mountBar({ selectedIds: [] })
		expect(wrapper.find('[data-testid="cn-bulk-band"]').exists()).toBe(false)
		expect(wrapper.find('.cn-actions-bar__sr-status').exists()).toBe(true)
	})

	it('announces the selection count through the live region', () => {
		const wrapper = mountBar()
		expect(wrapper.find('.cn-actions-bar__sr-status').text()).toBe('3 selected')
	})

	it('emits bulk-action with the selection', async () => {
		const wrapper = mountBar()
		await wrapper.find('[data-testid="cn-bulk-action-assign"]').trigger('click')
		expect(wrapper.emitted('bulk-action')[0][0]).toMatchObject({ id: 'assign', count: 3 })
	})

	it('keeps the strip inside the toolbar without the look', () => {
		const wrapper = mountBar({}, 'nextcloud')
		expect(wrapper.find('[data-testid="cn-bulk-band"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-selection-strip"]').exists()).toBe(true)
	})
})
