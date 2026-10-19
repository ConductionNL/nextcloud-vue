/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-move-block-reasons: `allowedMoves` (and the page's
 * `moveTargetsHandler`) may answer `{ key, allowed, reason }` besides plain
 * keys. A blocked target shows disabled with its reason in the card menu, the
 * refused column shows the reason under its header during a drag, and a drop
 * there is refused with it. Plain keys keep working.
 *
 * @spec openspec/changes/board-move-block-reasons/specs/board-view/spec.md
 */
var mockRefs = jest.fn()

jest.mock('../../src/utils/boardReferenceColumns.js', () => ({
	__esModule: true,
	...jest.requireActual('../../src/utils/boardReferenceColumns.js'),
	fetchReferenceObjects: (...args) => mockRefs(...args),
}))

import { flushPromises, mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnKanbanView from '../../src/components/CnKanbanView/CnKanbanView.vue'
import { normalizeAllowed } from '../../src/utils/boardColumns.js'

const REASON = 'Er is nog geen besluit vastgelegd.'
const FIELD = { states: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }, { key: 'd', label: 'D' }] }
const ROWS = [{ id: 1, status: 'a', title: 'One' }]

function mountBoard(props = {}, look = 'board') {
	return mount(CnKanbanView, {
		attachTo: document.body,
		props: { rows: ROWS, statusFieldSchema: FIELD, statusField: 'status', cardFields: ['title'], runTransition: jest.fn().mockResolvedValue({}), ...props },
		global: { provide: { cnLook: look } },
	})
}

const MIXED = async () => ['b', { key: 'c', allowed: false, reason: REASON }, { key: 'd', allowed: false }]

describe('normalizeAllowed', () => {
	it('reads plain keys and entries, an allowed entry wins over a blocked one, and the first reason stays', () => {
		expect(normalizeAllowed(null)).toBeNull()
		expect(normalizeAllowed(['b', 3])).toEqual({ keys: ['b', '3'], reasons: {} })
		expect(normalizeAllowed([
			{ key: 'b' },
			{ key: 'c', allowed: false, reason: ' Eerst ' },
			{ key: 'c', allowed: false, reason: 'Later' },
			{ key: 'd', allowed: true, reason: 'ignored' },
		])).toEqual({ keys: ['b', 'd'], reasons: { c: 'Eerst' } })
	})
})

describe('CnKanbanView: a blocked target with a reason', () => {
	it('shows the blocked target disabled in the menu with its reason, and "not allowed" without one', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition, allowedMoves: MIXED })
		await w.find('[data-testid="cn-kanban-card-menu"]').trigger('click')
		await flushPromises()
		const item = (key) => w.find(`[data-testid="cn-kanban-menu-move"][data-target="${key}"]`)
		expect(item('b').attributes('aria-disabled')).toBeUndefined()
		expect(item('c').attributes('aria-disabled')).toBe('true')
		expect(item('c').find('[data-testid="cn-kanban-menu-reason"]').text()).toBe(REASON)
		expect(item('c').find('[data-testid="cn-kanban-menu-blocked"]').exists()).toBe(false)
		expect(item('c').classes()).toContain('cn-kanban-view__menu-item--reason')
		expect(item('d').attributes('aria-disabled')).toBe('true')
		expect(item('d').find('[data-testid="cn-kanban-menu-blocked"]').text()).toBe('not allowed')
		expect(item('d').find('[data-testid="cn-kanban-menu-reason"]').exists()).toBe(false)
		await item('c').trigger('click')
		expect(runTransition).not.toHaveBeenCalled()
		w.unmount()
	})

	it('shows the reason under the refused column during a drag, refuses the drop with it, and clears it after', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition, allowedMoves: MIXED })
		await w.find('[data-testid="cn-kanban-card"]').trigger('dragstart')
		await flushPromises()
		expect(w.find('[data-column="c"] [data-testid="cn-kanban-column-reason"]').text()).toBe(REASON)
		expect(w.find('[data-column="c"]').classes()).toContain('cn-kanban-view__column--reason')
		expect(w.find('[data-column="d"]').attributes('data-unreachable')).toBe('true')
		expect(w.find('[data-column="d"] [data-testid="cn-kanban-column-reason"]').exists()).toBe(false)
		expect(w.find('[data-column="b"] [data-testid="cn-kanban-column-reason"]').exists()).toBe(false)
		await w.find('[data-column="c"]').trigger('drop')
		await flushPromises()
		expect(runTransition).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-kanban-refusal"]').text()).toBe(REASON)
		expect(w.findAll('[data-testid="cn-kanban-column-reason"]')).toHaveLength(0)
		w.unmount()
	})

	it('shows the reason in the Nextcloud look during a drag too', async () => {
		const w = mountBoard({ allowedMoves: MIXED }, 'nextcloud')
		await w.find('[data-testid="cn-kanban-card"]').trigger('dragstart')
		await flushPromises()
		expect(w.find('[data-column="c"] [data-testid="cn-kanban-column-reason"]').text()).toBe(REASON)
		w.unmount()
	})

	it('a column without a reason keeps the old sentence on a refused drop', async () => {
		const w = mountBoard({ allowedMoves: MIXED })
		await w.find('[data-testid="cn-kanban-card"]').trigger('dragstart')
		await flushPromises()
		await w.find('[data-column="d"]').trigger('drop')
		await flushPromises()
		expect(w.find('[data-testid="cn-kanban-refusal"]').text()).toBe('One cannot move to D.')
		w.unmount()
	})
})

describe('CnIndexPage: moveTargetsHandler entries', () => {
	const SCHEMA = { title: 'Case', slug: 'case', properties: { title: { type: 'string' }, status: { type: 'string', $ref: 'statusType' }, caseType: { type: 'string' } } }
	const STATUSES = [
		{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo' },
		{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo' },
		{ id: 's3', name: 'Besluit', order: 3, caseType: 'woo' },
	]
	const CASES = [{ id: 'c1', title: 'Woo een', status: 's1', caseType: 'woo' }]

	it('maps the referenced ids of plain values and of entries to their columns', async () => {
		mockRefs.mockResolvedValue(STATUSES)
		const targets = jest.fn().mockResolvedValue(['s2', { key: 's3', allowed: false, reason: REASON }, { key: { id: 's1' } }])
		const w = mount(CnIndexPage, {
			attachTo: document.body,
			propsData: {
				title: 'Zaken',
				register: 'dossiq',
				schema: SCHEMA,
				objects: CASES,
				viewMode: 'kanban',
				viewModes: ['table', 'kanban'],
				pagination: { page: 1, pages: 1, total: 1, limit: 20 },
				kanban: { statusField: 'status', moveTargetsHandler: 'targets', columnFields: [{ field: 'status', source: { schema: 'statusType', orderField: 'order', mergeBy: 'name' } }] },
			},
			global: {
				provide: { cnLook: 'board', cnRegistry: { targets } },
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Cases' } },
				stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true },
			},
		})
		await flushPromises()
		const allowed = await w.findComponent(CnKanbanView).props('allowedMoves')(CASES[0])
		expect(allowed).toEqual([
			'In behandeling',
			{ key: 'Besluit', allowed: false, reason: REASON },
			{ key: 'Ontvangen', allowed: true, reason: '' },
		])
		w.unmount()
	})
})
