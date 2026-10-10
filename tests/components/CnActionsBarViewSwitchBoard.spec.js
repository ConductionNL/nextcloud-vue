/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look's view switch: icon-only segments in the fixed order table,
 * cards, board, map, each only when offered, named and pressed, with no thumb.
 *
 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-view-switch-is-four-icon-segments-in-a-fixed-order
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

function mountBar(props = {}, look = 'board') {
	return mount(CnActionsBar, {
		props,
		global: { provide: { cnLook: look }, stubs: { NcButton: true, NcActions: true, CnBuildiqEditButton: true } },
	})
}

describe('CnActionsBar view switch (board look)', () => {
	it('renders four icon-only segments in the fixed order, only the active one pressed', () => {
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['cards', 'map', 'board', 'table'] })
		const buttons = wrapper.findAll('.cn-actions-bar__view-toggle-btn')
		expect(buttons.map((b) => b.attributes('aria-label'))).toEqual(['Table', 'Cards', 'Board', 'Map'])
		expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['true', 'false', 'false', 'false'])
		expect(wrapper.find('.cn-actions-bar__view-toggle-label').exists()).toBe(false)
		expect(wrapper.find('.cn-actions-bar__view-toggle-thumb').exists()).toBe(false)
		expect(wrapper.find('.cn-actions-bar__view-toggle').attributes('aria-label')).toBe('View mode')
	})

	it('renders three segments for a page without a map', () => {
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['board', 'cards', 'table'] })
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn').map((b) => b.attributes('aria-label'))).toEqual(['Table', 'Cards', 'Board'])
	})

	it('keeps a mode the switch does not name after the fixed four', () => {
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['list', 'cards', 'table'] })
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['table', 'cards', 'list'])
	})

	it('emits the mode of the clicked segment', async () => {
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['table', 'cards'] })
		await wrapper.findAll('.cn-actions-bar__view-toggle-btn')[1].trigger('click')
		expect(wrapper.emitted('view-mode-change')[0]).toEqual(['cards'])
	})

	it('keeps the labelled sliding switch without the look', () => {
		const wrapper = mountBar({ viewMode: 'cards' }, 'nextcloud')
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['cards', 'table'])
		expect(wrapper.find('.cn-actions-bar__view-toggle-thumb').exists()).toBe(true)
		expect(wrapper.find('.cn-actions-bar__view-toggle-label').exists()).toBe(true)
	})
})
