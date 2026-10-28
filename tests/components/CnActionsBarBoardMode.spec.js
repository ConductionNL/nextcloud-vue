/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page that is itself a board (PqPipeline: the leads by stage) offers the
 * `board` view in place: the Bord segment is a pressed button, not a link.
 *
 * @spec openspec/changes/actions-bar-board-view-mode/specs/actions-bar/spec.md#requirement-a-page-can-offer-the-board-view-in-place
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

function mountBar(props) {
	return mount(CnActionsBar, {
		props: { layout: 'board', showAdd: false, showActionsMenu: false, ...props },
		global: { stubs: { CnIcon: true, CnBuildiqEditButton: true } },
	})
}

describe('the board view offered in place', () => {
	it('draws Bord as a pressed button between Tabel and Kaarten/Map', async () => {
		const w = mountBar({ viewMode: 'board', availableViewModes: ['table', 'board'], disabledViewModes: ['cards', 'map'] })
		const segs = w.findAll('.cn-actions-bar__view-toggle-btn')
		expect(segs.map((s) => s.attributes('data-mode'))).toEqual(['table', 'cards', 'board', 'map'])
		const board = segs[2]
		expect(board.element.tagName).toBe('BUTTON')
		expect(board.attributes('aria-pressed')).toBe('true')
		await segs[0].trigger('click')
		expect(w.emitted('view-mode-change')[0]).toEqual(['table'])
	})

	it('accepts board in its view-mode props', () => {
		const { viewMode, availableViewModes } = CnActionsBar.props
		expect(viewMode.validator('board')).toBe(true)
		expect(availableViewModes.validator(['table', 'board'])).toBe(true)
	})
})
