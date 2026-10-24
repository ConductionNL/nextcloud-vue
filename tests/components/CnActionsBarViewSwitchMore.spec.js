/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board view switch draws the segments `viewSwitch` names, in that order,
 * and lists every other offered view under "More views" (DqTeamwachtrij: list,
 * cards, board, map; the table under More views).
 *
 * @spec openspec/changes/view-switch-order-and-more/specs/view-switch-board-look/spec.md#requirement-viewswitch-sets-the-segments-and-their-order-the-other-views-go-under-more-views
 */
import { mount } from '@vue/test-utils'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

function mountBar(props = {}, look = 'board') {
	return mount(CnActionsBar, {
		props,
		global: { provide: { cnLook: look }, stubs: { NcButton: true, CnBuildiqEditButton: true } },
	})
}

const QUEUE = { viewMode: 'list', availableViewModes: ['list', 'table', 'cards', 'board'], showMap: true, viewSwitch: ['list', 'cards', 'board', 'map'] }

describe('CnActionsBar view switch order and More views', () => {
	it('draws the named segments in the named order, list first', () => {
		const wrapper = mountBar(QUEUE)
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['list', 'cards', 'board', 'map'])
		const buttons = wrapper.findAll('.cn-actions-bar__view-toggle-btn')
		expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['true', 'false', 'false', 'false'])
	})

	it('lists an offered view it does not name under More views', () => {
		const wrapper = mountBar(QUEUE)
		expect(wrapper.vm.viewOverflow.map((s) => s.mode)).toEqual(['table'])
		expect(wrapper.find('[data-testid="cn-actions-bar-view-more"]').exists()).toBe(true)
	})

	it('opens a view from More views', () => {
		const wrapper = mountBar(QUEUE)
		wrapper.vm.onViewOverflowPick('table')
		expect(wrapper.emitted('view-mode-change')[0]).toEqual(['table'])
	})

	it('draws the list segment with the board\'s plain bullets', () => {
		const wrapper = mountBar(QUEUE)
		expect(wrapper.vm.viewSegments[0].boardFallback).toBe(FormatListBulleted)
	})

	it('keeps the fixed order and no More views without viewSwitch', () => {
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['list', 'cards', 'table'] })
		expect(wrapper.vm.viewSegments.map((s) => s.mode)).toEqual(['table', 'cards', 'list'])
		expect(wrapper.vm.viewOverflow).toEqual([])
		expect(wrapper.find('[data-testid="cn-actions-bar-view-more"]').exists()).toBe(false)
	})
})
