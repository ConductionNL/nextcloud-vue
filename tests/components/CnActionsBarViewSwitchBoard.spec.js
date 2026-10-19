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
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['cards', 'map', 'kanban', 'table'] })
		const buttons = wrapper.findAll('.cn-actions-bar__view-toggle-btn')
		expect(buttons.map((b) => b.attributes('aria-label'))).toEqual(['Table', 'Cards', 'Kanban', 'Map'])
		expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['true', 'false', 'false', 'false'])
		expect(wrapper.find('.cn-actions-bar__view-toggle-label').exists()).toBe(false)
		expect(wrapper.find('.cn-actions-bar__view-toggle-thumb').exists()).toBe(false)
		expect(wrapper.find('.cn-actions-bar__view-toggle').attributes('aria-label')).toBe('View mode')
	})

	it('renders three segments for a page without a map', () => {
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['kanban', 'cards', 'table'] })
		expect(wrapper.findAll('.cn-actions-bar__view-toggle-btn').map((b) => b.attributes('aria-label'))).toEqual(['Table', 'Cards', 'Kanban'])
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

	it('draws a mode that opens another page as a link in its place, never pressed', () => {
		const wrapper = mountBar({ viewMode: 'table', availableViewModes: ['table', 'cards'], disabledViewModes: ['map'], viewModeLinks: { kanban: { href: '#/cases/board', to: { name: 'CaseBoard' } } } })
		const segments = wrapper.findAll('.cn-actions-bar__view-toggle-btn')
		expect(segments.map((s) => s.attributes('aria-label'))).toEqual(['Table', 'Cards', 'Kanban', 'Map'])
		const board = segments[2]
		expect(board.element.tagName).toBe('A')
		expect(board.attributes('href')).toBe('#/cases/board')
		expect(board.attributes('aria-pressed')).toBeUndefined()
		expect(segments[3].attributes('disabled')).toBeDefined()
	})

	it('pushes the route on a plain click and leaves a modified click to the browser', async () => {
		const push = jest.fn()
		const wrapper = mount(CnActionsBar, {
			props: { viewMode: 'table', availableViewModes: ['table'], viewModeLinks: { kanban: { href: '#/cases/board', to: { name: 'CaseBoard' } } } },
			global: { provide: { cnLook: 'board' }, mocks: { $router: { push } }, stubs: { NcButton: true, NcActions: true, CnBuildiqEditButton: true } },
		})
		const link = wrapper.find('[data-testid="cn-actions-bar-view-link"]')
		await link.trigger('click', { ctrlKey: true })
		expect(push).not.toHaveBeenCalled()
		await link.trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'CaseBoard' })
		expect(wrapper.emitted('view-mode-change')).toBeUndefined()
	})

	it('keeps a mode the page offers in place a button, and ignores links without the look', () => {
		const inPlace = mountBar({ viewMode: 'table', availableViewModes: ['table', 'kanban'], viewModeLinks: { kanban: { href: '#/x' } } })
		expect(inPlace.find('[data-testid="cn-actions-bar-view-link"]').exists()).toBe(false)
		const plain = mountBar({ viewMode: 'table', availableViewModes: ['table', 'cards'], viewModeLinks: { kanban: { href: '#/x' } } }, 'nextcloud')
		expect(plain.find('[data-testid="cn-actions-bar-view-link"]').exists()).toBe(false)
	})
})
