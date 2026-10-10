/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board view switch: four segments as PqTickets, PqLeads and PtPortals
 * draw them, the ones the page cannot open drawn disabled when the manifest
 * asks for them, 18px icons, and the group named "View mode".
 *
 * @spec openspec/changes/screens-view-switch-parity/specs/view-switch-board-look/spec.md#requirement-the-manifest-can-draw-segments-the-page-cannot-open
 * @spec openspec/changes/screens-view-switch-parity/specs/view-switch-board-look/spec.md#requirement-the-segments-carry-the-boards-icons
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const stubs = { NcButton: { template: '<button type="button"><slot /></button>' }, NcActions: true, CnBuildiqEditButton: true }

function mountBar(props = {}, look = 'board') {
	return mount(CnActionsBar, {
		props: { showViewToggle: true, viewMode: 'table', availableViewModes: ['table', 'cards'], ...props },
		global: { provide: { cnLook: look }, stubs },
	})
}

describe('CnActionsBar: disabled segments', () => {
	it('draws the disabled modes in the board order, inert and named so', async () => {
		const w = mountBar({ disabledViewModes: ['map', 'board'] })
		const segs = w.findAll('.cn-actions-bar__view-toggle-btn')
		expect(segs.map((b) => b.attributes('data-mode'))).toEqual(['table', 'cards', 'board', 'map'])
		const board = segs[2]
		expect(board.attributes('disabled')).toBeDefined()
		expect(board.classes()).toContain('cn-actions-bar__view-toggle-btn--disabled')
		expect(board.attributes('title')).toBe('Board: not available on this list')
		expect(board.attributes('aria-label')).toBe('Board')
		await board.trigger('click')
		expect(w.emitted('view-mode-change')).toBeUndefined()
		await segs[1].trigger('click')
		expect(w.emitted('view-mode-change')[0]).toEqual(['cards'])
	})

	it('does not double a mode the page can open', () => {
		const w = mountBar({ disabledViewModes: ['cards'] })
		const segs = w.findAll('.cn-actions-bar__view-toggle-btn')
		expect(segs).toHaveLength(2)
		expect(segs[1].attributes('disabled')).toBeUndefined()
	})

	it('names the group "View mode" and ignores the prop without the look', () => {
		expect(mountBar().find('.cn-actions-bar__view-toggle').attributes('aria-label')).toBe('View mode')
		const legacy = mountBar({ disabledViewModes: ['map'] }, 'nextcloud')
		expect(legacy.findAll('.cn-actions-bar__view-toggle-btn')).toHaveLength(2)
	})
})

describe('CnIndexPage: config.viewSwitch', () => {
	const BarStub = {
		name: 'CnActionsBar',
		props: ['disabledViewModes', 'availableViewModes'],
		template: '<div class="bar" :data-disabled="(disabledViewModes || []).join(\',\')" />',
	}

	function mountPage(extra = {}, look = 'board') {
		return mount(CnIndexPage, {
			propsData: { title: 'Tickets', schema: { title: 'Ticket', properties: {} }, objects: [], pagination: { page: 1, pages: 1, total: 0, limit: 20 }, ...extra },
			global: {
				provide: { cnLook: look },
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Tickets' } },
				stubs: { CnActionsBar: BarStub, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true },
			},
		})
	}

	it('disables the listed modes the page cannot open (no board columns, no map)', () => {
		const w = mountPage({ viewSwitch: ['table', 'cards', 'board', 'map'] })
		expect(w.find('.bar').attributes('data-disabled')).toBe('board,map')
	})

	it('keeps an offered mode enabled', () => {
		const w = mountPage({ viewSwitch: ['table', 'cards', 'board', 'map'], mapConfig: { geoField: 'geometry' } })
		expect(w.find('.bar').attributes('data-disabled')).toBe('board')
	})

	it('disables nothing without the key or without the look', () => {
		expect(mountPage().find('.bar').attributes('data-disabled')).toBe('')
		expect(mountPage({ viewSwitch: ['map'] }, 'nextcloud').find('.bar').attributes('data-disabled')).toBe('')
	})

	it('is a manifest key with the four board modes', () => {
		const manifest = (config) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'p', route: '/p', type: 'index', title: 'P', config }],
		})
		expect(validateManifestV2(manifest({ register: 'r', schema: 's', viewSwitch: ['table', 'cards', 'board', 'map'] })).valid).toBe(true)
		expect(validateManifestV2(manifest({ register: 'r', schema: 's', viewSwitch: ['timeline'] })).valid).toBe(false)
	})
})
