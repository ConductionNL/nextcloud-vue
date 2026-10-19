/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-board-reference-columns: an index page's board takes its columns
 * from a referenced field (statusType rows), switches the field the columns
 * come from, narrows by a parent, writes the reference on a drop (or runs the
 * app's named handler), selects cards for bulk actions, and marks the columns
 * a card cannot reach.
 *
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md
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

const SCHEMA = {
	title: 'Case',
	slug: 'case',
	properties: {
		title: { type: 'string' },
		status: { type: 'string', $ref: 'statusType' },
		caseType: { type: 'string', $ref: 'caseType', title: 'Case type' },
		assignee: { type: 'string' },
	},
}
const STATUSES = [
	{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo' },
	{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo' },
	{ id: 'b1', name: 'Ontvangen', order: 1, caseType: 'bez' },
	{ id: 'b4', name: 'Hoorzitting', order: 4, caseType: 'bez' },
]
const TYPES = [{ id: 'woo', title: 'Woo-verzoek' }, { id: 'bez', title: 'Bezwaar' }]
const ROWS = [
	{ id: 'c1', title: 'Rapport A16', status: 's1', caseType: 'woo', assignee: 'pieter' },
	{ id: 'c2', title: 'Parkeren', status: 's2', caseType: 'woo', assignee: '' },
	{ id: 'c3', title: 'Bezwaar boete', status: 'b1', caseType: 'bez', assignee: 'anouk' },
]
const BOARD = {
	statusField: 'status',
	cardFields: ['title'],
	hint: 'Een kolom per waarde.',
	columnSwitchLabel: 'Kolommen',
	narrow: { field: 'caseType', label: 'Zaaktype', allLabel: 'Alle zaaktypen', source: { schema: 'caseType', labelField: 'title' } },
	columnFields: [
		{ field: 'status', label: 'status', source: { schema: 'statusType', labelField: 'name', orderField: 'order', mergeBy: 'name', narrowBy: { field: 'caseType', rowField: 'caseType' } } },
		{ field: 'caseType', label: 'type', source: { schema: 'caseType', labelField: 'title' }, readOnly: true },
		{ field: 'assignee', label: 'behandelaar', kind: 'values', emptyLabel: 'Niemand' },
	],
}

async function mountPage(extra = {}, registry = {}) {
	const w = mount(CnIndexPage, {
		attachTo: document.body,
		propsData: {
			title: 'Alle zaken',
			register: 'dossiq',
			schema: SCHEMA,
			objects: ROWS,
			viewMode: 'kanban',
			viewModes: ['table', 'kanban'],
			pagination: { page: 1, pages: 1, total: 3, limit: 20 },
			kanban: BOARD,
			...extra,
		},
		global: {
			provide: { cnLook: 'board', cnRegistry: registry },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Cases' } },
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true },
		},
	})
	await flushPromises()
	return w
}

const columns = (w) => w.findAll('[data-testid="cn-kanban-column"]').map((c) => c.attributes('data-column'))
const board = (w) => w.findComponent(CnKanbanView)

describe('CnIndexPage board: columns from a referenced field', () => {
	beforeEach(() => {
		mockRefs.mockReset()
		mockRefs.mockImplementation(async ({ schema }) => (schema === 'statusType' ? STATUSES : TYPES))
		mockPatch.mockReset()
		mockPatch.mockResolvedValue({})
	})

	it('fetches the referenced rows and draws them as merged, ordered columns, with every card in its column', async () => {
		const w = await mountPage()
		expect(mockRefs).toHaveBeenCalledWith(expect.objectContaining({ register: 'dossiq', schema: 'statusType' }))
		expect(columns(w)).toEqual(['Ontvangen', 'In behandeling', 'Hoorzitting'])
		const ontvangen = w.find('[data-column="Ontvangen"]')
		expect(ontvangen.findAll('[data-testid="cn-kanban-card"]').map((c) => c.attributes('data-card-id'))).toEqual(['c1', 'c3'])
		w.unmount()
	})

	it('draws the narrow select, the column switch and the hint after the search', async () => {
		const w = await mountPage()
		expect(w.find('[data-testid="cn-kanban-narrow"]').text()).toContain('Zaaktype:')
		const options = w.findAll('[data-testid="cn-kanban-narrow-select"] option').map((o) => o.text())
		expect(options).toEqual(['Alle zaaktypen', 'Bezwaar', 'Woo-verzoek'])
		expect(w.find('[data-testid="cn-kanban-column-switch"]').text()).toContain('Kolommen:')
		expect(w.findAll('[data-testid="cn-kanban-column-switch-select"] option').map((o) => o.text())).toEqual(['status', 'type', 'behandelaar'])
		expect(w.find('[data-testid="cn-kanban-hint"]').text()).toBe('Een kolom per waarde.')
		w.unmount()
	})

	it('draws none of the controls outside the board view, nor on a board without them', async () => {
		const table = await mountPage({ viewMode: 'table' })
		expect(table.find('[data-testid="cn-kanban-column-switch"]').exists()).toBe(false)
		table.unmount()
		const plain = await mountPage({ kanban: { statusField: 'status' } })
		expect(plain.find('[data-testid="cn-kanban-column-switch"]').exists()).toBe(false)
		expect(plain.find('[data-testid="cn-kanban-narrow"]').exists()).toBe(false)
		plain.unmount()
	})

	it('narrows the columns to one parent while the page filters on it', async () => {
		const w = await mountPage({ activeFilters: { caseType: ['bez'] }, objects: ROWS.filter((row) => row.caseType === 'bez') })
		expect(columns(w)).toEqual(['Ontvangen', 'Hoorzitting'])
		w.unmount()
	})

	it('the narrow select sets the page filter on its field', async () => {
		const w = await mountPage()
		await w.find('[data-testid="cn-kanban-narrow-select"]').setValue('woo')
		expect(w.emitted('filter-change').at(-1)[0]).toEqual(expect.objectContaining({ key: 'caseType', values: ['woo'] }))
		w.unmount()
	})

	it('switches the columns to another reference field and to the values of a user field', async () => {
		const w = await mountPage()
		await w.find('[data-testid="cn-kanban-column-switch-select"]').setValue('caseType')
		await flushPromises()
		expect(columns(w)).toEqual(['woo', 'bez'])
		expect(board(w).props('runTransition')).toBeNull()
		await w.find('[data-testid="cn-kanban-column-switch-select"]').setValue('assignee')
		await flushPromises()
		expect(columns(w)).toEqual(['anouk', 'pieter', '__none__'])
		expect(w.find('[data-column="__none__"]').text()).toContain('Niemand')
		expect(w.emitted('board-column-field-change').map((e) => e[0])).toEqual(['caseType', 'assignee'])
		w.unmount()
	})

	it('a drop writes the row of the card\'s own case type', async () => {
		const w = await mountPage()
		const move = board(w).props('runTransition')
		await move({ card: ROWS[2], toKey: 'Hoorzitting' })
		expect(mockPatch).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/case/c3', { status: 'b4' })
		await expect(move({ card: ROWS[0], toKey: 'Hoorzitting' })).rejects.toThrow('This card cannot move to that column.')
		w.unmount()
	})

	it('a values field writes the value, and null for the no-value column', async () => {
		const w = await mountPage()
		await w.find('[data-testid="cn-kanban-column-switch-select"]').setValue('assignee')
		await flushPromises()
		const move = board(w).props('runTransition')
		await move({ card: ROWS[1], toKey: 'anouk' })
		await move({ card: ROWS[0], toKey: '__none__' })
		expect(mockPatch.mock.calls.map((c) => c[1])).toEqual([{ assignee: 'anouk' }, { assignee: null }])
		w.unmount()
	})

	it('a named moveHandler from the registry makes the move instead of a PATCH', async () => {
		const handler = jest.fn().mockResolvedValue({ id: 'c2' })
		const w = await mountPage({ kanban: { ...BOARD, moveHandler: 'caseStatusMove' } }, { caseStatusMove: handler })
		await board(w).props('runTransition')({ card: ROWS[1], toKey: 'Ontvangen' })
		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ field: 'status', value: 's1', toKey: 'Ontvangen', target: STATUSES[0] }))
		expect(mockPatch).not.toHaveBeenCalled()
		w.unmount()
	})

	it('a moveTargetsHandler answers the columns a card can reach', async () => {
		const targets = jest.fn().mockResolvedValue(['s2'])
		const w = await mountPage({ kanban: { ...BOARD, moveTargetsHandler: 'caseStatusTargets' } }, { caseStatusTargets: targets })
		const allowed = await board(w).props('allowedMoves')(ROWS[0])
		expect(allowed).toEqual(['In behandeling'])
		expect(targets).toHaveBeenCalledWith({ card: ROWS[0], field: 'status' })
		w.unmount()
	})

	it('a board without columnFields keeps reading the schema and the runTransition prop', async () => {
		const runTransition = jest.fn()
		const w = await mountPage({
			kanban: { statusField: 'phase' },
			runTransition,
			schema: { properties: { phase: { enum: ['a', 'b'] } } },
			objects: [{ id: 1, phase: 'a' }],
		})
		expect(columns(w)).toEqual(['a', 'b'])
		expect(board(w).props('runTransition')).toBe(runTransition)
		expect(board(w).props('columnKeyOf')).toBeNull()
		w.unmount()
	})

	it('opens in the mode ?_view= names when the page offers it, and ignores one it does not', async () => {
		const mountWith = (query) => mount(CnIndexPage, {
			propsData: { title: 'Zaken', schema: SCHEMA, objects: ROWS, viewModes: ['table', 'kanban'], kanban: { statusField: 'status' } },
			global: {
				provide: { cnLook: 'board' },
				mocks: { $router: { push: jest.fn() }, $route: { query, params: {}, name: 'Cases' } },
				stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnKanbanView: true },
			},
		})
		const board = mountWith({ _view: 'kanban' })
		expect(board.vm.currentViewMode).toBe('kanban')
		board.unmount()
		const map = mountWith({ _view: 'map' })
		expect(map.vm.currentViewMode).toBe('table')
		map.unmount()
	})

	it('selecting a card on the board feeds the page selection', async () => {
		const w = await mountPage({ selectable: true })
		await w.find('[data-testid="cn-kanban-card-select"][data-card-id="c2"]').setValue(true)
		expect(w.emitted('select').at(-1)[0]).toEqual(['c2'])
		w.unmount()
	})
})

describe('CnKanbanView: where a card can go', () => {
	const FIELD = { states: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }] }
	const rows = [{ id: 1, status: 'a', title: 'One' }]
	const mountBoard = (props) => mount(CnKanbanView, {
		attachTo: document.body,
		props: { rows, statusFieldSchema: FIELD, statusField: 'status', cardFields: ['title'], runTransition: jest.fn().mockResolvedValue({}), ...props },
		global: { provide: { cnLook: 'board' } },
	})

	it('marks the targets the card cannot reach as not allowed in its menu, and does not move there', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition, allowedMoves: async () => ['b'] })
		await w.find('[data-testid="cn-kanban-card-menu"]').trigger('click')
		await flushPromises()
		const items = w.findAll('[data-testid="cn-kanban-menu-move"]')
		expect(items.map((i) => [i.attributes('data-target'), i.attributes('aria-disabled') ?? null])).toEqual([['b', null], ['c', 'true']])
		expect(items[1].text()).toContain('not allowed')
		await items[1].trigger('click')
		expect(runTransition).not.toHaveBeenCalled()
		w.unmount()
	})

	it('fades the unreachable columns during a drag and refuses a drop there without asking the host', async () => {
		const runTransition = jest.fn().mockResolvedValue({})
		const w = mountBoard({ runTransition, allowedMoves: async () => ['b'] })
		await w.find('[data-testid="cn-kanban-card"]').trigger('dragstart')
		await flushPromises()
		expect(w.find('[data-column="c"]').attributes('data-unreachable')).toBe('true')
		expect(w.find('[data-column="b"]').attributes('data-unreachable')).toBeUndefined()
		await w.find('[data-column="c"]').trigger('drop')
		await flushPromises()
		expect(runTransition).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-kanban-refusal"]').text()).toBe('One cannot move to C.')
		expect(w.find('[data-column="c"]').attributes('data-unreachable')).toBeUndefined()
		w.unmount()
	})

	it('without allowedMoves every target is offered and nothing fades', async () => {
		const w = mountBoard({})
		await w.find('[data-testid="cn-kanban-card-menu"]').trigger('click')
		await flushPromises()
		expect(w.findAll('[data-testid="cn-kanban-menu-blocked"]')).toHaveLength(0)
		await w.find('[data-testid="cn-kanban-card"]').trigger('dragstart')
		expect(w.findAll('[data-unreachable]')).toHaveLength(0)
		w.unmount()
	})

	it('shows a card field through the formatter card.formatters names, and the raw value without one', () => {
		const w = mount(CnKanbanView, {
			attachTo: document.body,
			props: {
				rows: [{ id: 1, status: 'a', title: 'One', caseType: 'woo', assignee: 'pieter' }],
				statusFieldSchema: FIELD,
				statusField: 'status',
				cardRoles: { title: 'title', pill: 'caseType', owner: 'assignee', formatters: { caseType: 'caseTypeName' } },
			},
			global: { provide: { cnLook: 'board', cnFormatters: { caseTypeName: (value) => (value === 'woo' ? 'Woo-verzoek' : value) } } },
		})
		expect(w.find('[data-testid="cn-kanban-card-pill"]').text()).toBe('Woo-verzoek')
		expect(w.find('[data-testid="cn-kanban-card-owner"]').attributes('aria-label')).toBe('pieter')
		w.unmount()
	})

	it('wraps the columns with wrapColumns', () => {
		const w = mountBoard({ wrapColumns: true })
		expect(w.classes()).toContain('cn-kanban-view--wrap')
		w.unmount()
	})
})
