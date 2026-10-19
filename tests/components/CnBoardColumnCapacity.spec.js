/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-column-capacity on the board: the header reads "count / capacity",
 * a full column is styled and said full, and a move into it is refused with a
 * sentence without asking the host, by drag, menu and select alike. A column
 * without a limit reads as before.
 *
 * @spec openspec/changes/board-column-capacity/specs/board-view/spec.md
 */
var mockRefs = jest.fn()
var mockPatch = jest.fn()

jest.mock('../../src/utils/boardReferenceColumns.js', () => ({
	__esModule: true,
	...jest.requireActual('../../src/utils/boardReferenceColumns.js'),
	fetchReferenceObjects: (...args) => mockRefs(...args),
}))

jest.mock('../../src/utils/objectWrite.js', () => ({
	__esModule: true,
	...jest.requireActual('../../src/utils/objectWrite.js'),
	patchObject: (...args) => mockPatch(...args),
}))

import { flushPromises, mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnKanbanView from '../../src/components/CnKanbanView/CnKanbanView.vue'

const FIELD = { states: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B', capacity: 1 }, { key: 'c', label: 'C', capacity: 3 }] }
const ROWS = [{ id: 1, status: 'a', title: 'One' }, { id: 2, status: 'b', title: 'Two' }]

function mountBoard(props = {}, look = 'board') {
	return mount(CnKanbanView, {
		attachTo: document.body,
		props: { rows: ROWS, statusFieldSchema: FIELD, statusField: 'status', cardFields: ['title'], runTransition: jest.fn().mockResolvedValue({}), ...props },
		global: { provide: { cnLook: look } },
	})
}

describe('CnKanbanView: a column with a capacity', () => {
	it('reads "count / capacity" in the header and marks the full column, and a column without one reads its count', () => {
		const w = mountBoard()
		const count = (key) => w.find(`[data-column="${key}"] [data-testid="cn-kanban-count"]`)
		expect(count('a').text()).toBe('1')
		expect(count('b').text()).toBe('1 / 1 full')
		expect(count('b').classes()).toContain('cn-kanban-view__badge--full')
		expect(count('c').text()).toBe('0 / 3')
		expect(count('c').classes()).not.toContain('cn-kanban-view__badge--full')
		expect(w.find('[data-column="b"]').attributes('data-full')).toBe('true')
		expect(w.find('[data-column="c"]').attributes('data-full')).toBeUndefined()
		w.unmount()
	})

	it('reads the same in the Nextcloud look', () => {
		const w = mountBoard({}, 'nextcloud')
		expect(w.find('[data-column="b"] [data-testid="cn-kanban-count"]').text()).toBe('1 / 1 full')
		expect(w.find('[data-column="b"] [data-testid="cn-kanban-count"]').classes()).toContain('cn-kanban-view__count--full')
		w.unmount()
	})

	it('refuses a drop on a full column with a sentence, without asking the host', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition })
		await w.find('[data-testid="cn-kanban-card"][data-card-id="1"]').trigger('dragstart')
		expect(w.find('[data-column="b"]').attributes('data-unreachable')).toBe('true')
		expect(w.find('[data-column="c"]').attributes('data-unreachable')).toBeUndefined()
		await w.find('[data-column="b"]').trigger('drop')
		await flushPromises()
		expect(runTransition).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-kanban-refusal"]').text()).toBe('B is full: 1 of 1.')
		expect(w.emitted('refused')[0][0].message).toBe('B is full: 1 of 1.')
		w.unmount()
	})

	it('still moves into a column below its limit', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition })
		await w.find('[data-testid="cn-kanban-card"][data-card-id="1"]').trigger('dragstart')
		await w.find('[data-column="c"]').trigger('drop')
		await flushPromises()
		expect(runTransition).toHaveBeenCalledWith({ card: ROWS[0], toKey: 'c' })
		w.unmount()
	})

	it('marks a full column "full" in the card menu and does not move there', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition })
		await w.find('[data-testid="cn-kanban-card-menu"][data-card-id="1"]').trigger('click')
		await flushPromises()
		const full = w.find('[data-testid="cn-kanban-menu-move"][data-target="b"]')
		expect(full.attributes('aria-disabled')).toBe('true')
		expect(full.find('[data-testid="cn-kanban-menu-blocked"]').text()).toBe('full')
		await full.trigger('click')
		expect(runTransition).not.toHaveBeenCalled()
		w.unmount()
	})

	it('refuses the Move to select of the Nextcloud look too', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition }, 'nextcloud')
		const select = w.find('[data-testid="cn-kanban-move"][data-card-id="1"]')
		select.element.value = 'b'
		await select.trigger('change')
		await flushPromises()
		expect(runTransition).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-kanban-refusal"]').text()).toBe('B is full: 1 of 1.')
		w.unmount()
	})

	it('without any capacity nothing is full and nothing fades', async () => {
		const w = mountBoard({ statusFieldSchema: { states: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] } })
		expect(w.findAll('[data-full]')).toHaveLength(0)
		expect(w.find('[data-column="b"] [data-testid="cn-kanban-count"]').text()).toBe('1')
		await w.find('[data-testid="cn-kanban-card"]').trigger('dragstart')
		expect(w.findAll('[data-unreachable]')).toHaveLength(0)
		w.unmount()
	})
})

describe('CnIndexPage: source.capacityField', () => {
	const SCHEMA = { title: 'Case', slug: 'case', properties: { title: { type: 'string' }, status: { type: 'string', $ref: 'statusType' }, caseType: { type: 'string' } } }
	const STATUSES = [
		{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo' },
		{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo', max: 1 },
		{ id: 'b1', name: 'Ontvangen', order: 1, caseType: 'bez' },
		{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bez', max: 4 },
	]
	const CASES = [
		{ id: 'c1', title: 'Woo een', status: 's1', caseType: 'woo' },
		{ id: 'c2', title: 'Woo twee', status: 's2', caseType: 'woo' },
		{ id: 'c3', title: 'Bezwaar', status: 'b1', caseType: 'bez' },
	]
	const board = (capacityField) => ({
		statusField: 'status',
		cardFields: ['title'],
		columnFields: [{ field: 'status', source: { schema: 'statusType', orderField: 'order', mergeBy: 'name', narrowBy: { field: 'caseType', rowField: 'caseType' }, ...(capacityField ? { capacityField } : {}) } }],
	})
	const mountPage = async (capacityField) => {
		const w = mount(CnIndexPage, {
			attachTo: document.body,
			propsData: { title: 'Zaken', register: 'dossiq', schema: SCHEMA, objects: CASES, viewMode: 'kanban', viewModes: ['table', 'kanban'], pagination: { page: 1, pages: 1, total: 3, limit: 20 }, board: board(capacityField) },
			global: {
				provide: { cnLook: 'board' },
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Cases' } },
				stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true },
			},
		})
		await flushPromises()
		return w
	}

	beforeEach(() => {
		mockRefs.mockReset()
		mockRefs.mockResolvedValue(STATUSES)
		mockPatch.mockReset()
		mockPatch.mockResolvedValue({})
	})

	it('refuses a move into a full concrete row of a merged column, and lets the other parent through', async () => {
		const w = await mountPage('max')
		const move = w.findComponent(CnKanbanView).props('runTransition')
		await expect(move({ card: CASES[0], toKey: 'In behandeling' })).rejects.toThrow('In behandeling is full: 1 of 1.')
		expect(mockPatch).not.toHaveBeenCalled()
		await move({ card: CASES[2], toKey: 'In behandeling' })
		expect(mockPatch).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/case/c3', { status: 'b2' })
		w.unmount()
	})

	it('shows no limit on a merged column', async () => {
		const w = await mountPage('max')
		expect(w.find('[data-column="In behandeling"] [data-testid="cn-kanban-count"]').text()).toBe('1')
		w.unmount()
	})

	it('without capacityField the move is not checked', async () => {
		const w = await mountPage('')
		await w.findComponent(CnKanbanView).props('runTransition')({ card: CASES[0], toKey: 'In behandeling' })
		expect(mockPatch).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/case/c1', { status: 's2' })
		w.unmount()
	})
})
