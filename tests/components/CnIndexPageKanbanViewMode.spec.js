/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The columns-of-cards view mode is `kanban`. Its former name `board` shipped
 * in manifests, saved views and addresses, so every place a mode is read
 * still takes `board` and treats it as `kanban`.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { CnBoardView, CnKanbanView } from '../../src/components/CnKanbanView/index.js'
import * as library from '../../src/components/index.js'

const SCHEMA = { title: 'Case', properties: { title: { type: 'string' }, status: { type: 'string', enum: ['open', 'closed'] } } }
const ROWS = [{ id: 'c1', title: 'A', status: 'open' }, { id: 'c2', title: 'B', status: 'closed' }]
const STUBS = { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnKanbanView: true }

function mountPage(props = {}, { query = {}, look = 'nextcloud' } = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Cases', schema: SCHEMA, objects: ROWS, ...props },
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: jest.fn() }, $route: { query, params: {}, name: 'Cases' } },
			stubs: STUBS,
		},
	})
}

describe('CnIndexPage: the kanban view mode', () => {
	it('opens the kanban from viewMode kanban with a kanban config', () => {
		const w = mountPage({ viewMode: 'kanban', viewModes: ['table', 'kanban'], kanban: { statusField: 'status' } })
		expect(w.vm.currentViewMode).toBe('kanban')
		expect(w.vm.effectiveToggleModes).toEqual(['table', 'kanban'])
		expect(w.findComponent(CnKanbanView).exists()).toBe(true)
		w.unmount()
	})

	it('opens ?_view=kanban', () => {
		const w = mountPage({ viewModes: ['table', 'kanban'], kanban: { statusField: 'status' } }, { query: { _view: 'kanban' } })
		expect(w.vm.currentViewMode).toBe('kanban')
		w.unmount()
	})

	it('emits view-mode-change with kanban', () => {
		const w = mountPage({ viewModes: ['table', 'kanban'], kanban: { statusField: 'status' } })
		w.vm.onViewModeChange('kanban')
		expect(w.emitted('view-mode-change')[0]).toEqual(['kanban'])
		w.unmount()
	})
})

describe('CnIndexPage: board is a deprecated alias of kanban', () => {
	it('reads viewMode board as kanban, also when the prop changes later', async () => {
		const w = mountPage({ viewMode: 'board', viewModes: ['table', 'board'], kanban: { statusField: 'status' } })
		expect(w.vm.currentViewMode).toBe('kanban')
		expect(w.findComponent(CnKanbanView).exists()).toBe(true)
		await w.setProps({ viewMode: 'table' })
		await w.setProps({ viewMode: 'board' })
		expect(w.vm.currentViewMode).toBe('kanban')
		w.unmount()
	})

	it('offers the kanban for board in viewModes and availableViewModes, once', () => {
		const listed = mountPage({ viewModes: ['table', 'board', 'kanban'], kanban: { statusField: 'status' } })
		expect(listed.vm.effectiveToggleModes).toEqual(['table', 'kanban'])
		listed.unmount()
		const available = mountPage({ availableViewModes: ['table', 'board'], kanban: { statusField: 'status' } })
		expect(available.vm.effectiveToggleModes).toEqual(['table', 'kanban'])
		available.unmount()
	})

	it('opens ?_view=board as the kanban', () => {
		const w = mountPage({ viewModes: ['table', 'kanban'], kanban: { statusField: 'status' } }, { query: { _view: 'board' } })
		expect(w.vm.currentViewMode).toBe('kanban')
		w.unmount()
	})

	it('emits kanban when a host still switches to board', () => {
		const w = mountPage({ viewModes: ['table', 'kanban'], kanban: { statusField: 'status' } })
		w.vm.onViewModeChange('board')
		expect(w.vm.currentViewMode).toBe('kanban')
		expect(w.emitted('view-mode-change')[0]).toEqual(['kanban'])
		w.unmount()
	})

	it('reads the board config when there is no kanban config, and lets kanban win', () => {
		const old = mountPage({ viewModes: ['table', 'kanban'], board: { statusField: 'status', columnLimit: 3 } })
		expect(old.vm.kanbanConfig).toEqual({ statusField: 'status', columnLimit: 3 })
		expect(old.vm.effectiveToggleModes).toEqual(['table', 'kanban'])
		old.unmount()
		const both = mountPage({ viewModes: ['table', 'kanban'], board: { statusField: 'phase' }, kanban: { statusField: 'status' } })
		expect(both.vm.kanbanConfig).toEqual({ statusField: 'status' })
		both.unmount()
	})

	it('reads board in viewSwitch and as a viewSwitchLinks key under the board look', () => {
		const disabled = mountPage({ viewSwitch: ['table', 'cards', 'board', 'map'] }, { look: 'board' })
		expect(disabled.vm.viewSwitchDisabledModes).toEqual(['kanban', 'map'])
		disabled.unmount()
		const linked = mountPage({ viewSwitchLinks: { board: { href: '#/cases/kanban' } } }, { look: 'board' })
		expect(linked.vm.viewSwitchLinkTargets).toEqual({ kanban: { href: '#/cases/kanban' } })
		linked.unmount()
	})

	it('reads board in folderSidebar.scopeViews', () => {
		const w = mountPage({ viewMode: 'kanban', viewModes: ['table', 'kanban'], kanban: { statusField: 'status' }, folderSidebar: { scopeViews: ['board'] } })
		expect(w.vm.scopeShapesView).toBe(true)
		w.unmount()
	})
})

describe('CnActionsBar: the kanban segment', () => {
	const stubs = { NcButton: true, NcActions: true, CnBuildiqEditButton: true }
	const mountBar = (props) => mount(CnActionsBar, { props, global: { provide: { cnLook: 'board' }, stubs } })

	it('names the segment Kanban', () => {
		const w = mountBar({ viewMode: 'kanban', availableViewModes: ['table', 'kanban'] })
		const kanban = w.find('[data-mode="kanban"]')
		expect(kanban.attributes('aria-label')).toBe('Kanban')
		expect(kanban.attributes('aria-pressed')).toBe('true')
	})

	it('draws board as the kanban segment and presses it for viewMode board', () => {
		const w = mountBar({ viewMode: 'board', availableViewModes: ['board', 'table'], disabledViewModes: ['board'], viewModeLinks: { board: { href: '#/x' } } })
		expect(w.vm.viewSegments.map((s) => s.mode)).toEqual(['table', 'kanban'])
		expect(w.find('[data-mode="board"]').exists()).toBe(false)
		expect(w.find('[data-mode="kanban"]').attributes('aria-pressed')).toBe('true')
	})
})

describe('CnBoardView', () => {
	it('is an alias of CnKanbanView', () => {
		expect(CnBoardView).toBe(CnKanbanView)
		expect(library.CnBoardView).toBe(library.CnKanbanView)
		expect(CnKanbanView.name).toBe('CnKanbanView')
	})
})
