/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-kanban-parity: the board look of CnBoardView. The column header, the
 * card anatomy from field roles, the card menu that replaces the visible
 * select, the M key and the column cut. Without the look the board renders as
 * before, and the move contract of `board-card-role-and-keyboard` is intact.
 *
 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
	getCanonicalLocale: () => 'en-US',
}))

const { mount } = require('@vue/test-utils')
const CnBoardView = require('../../src/components/CnBoardView/CnBoardView.vue').default
const { buildBoardColumns, resolveStageColor } = require('../../src/utils/boardColumns.js')

const FIELD = {
	states: [
		{ key: 'received', label: 'Received', color: 'primary', tone: '#7a3' },
		{ key: 'doing', label: 'In progress', color: '#5b4bb3' },
		{ key: 'decision', label: 'Decision' },
	],
}

const today = new Date()
function iso(offset) {
	const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ROWS = [
	{ id: 1, status: 'received', title: 'Report noise A16', identifier: '2026-0083', requester: 'R. Smit', type: 'Melding', deadline: iso(0), assignee: 'Anouk Bakker', amount: 100 },
	{ id: 2, status: 'received', title: 'Minutes', identifier: '2026-0085', requester: '', type: 'Woo', deadline: iso(9), assignee: '', amount: 100 },
	{ id: 3, status: 'received', title: 'Third', amount: 100 },
	{ id: 4, status: 'doing', title: 'Late one', deadline: iso(-3), assignee: 'Pieter Jansen' },
]
const CARD = { title: 'title', sub: ['identifier', 'requester'], pill: 'type', due: 'deadline', owner: 'assignee' }

/**
 * @param {object} props Extra props.
 * @param {boolean} [isBoard] The board look on.
 * @return {object} The wrapper.
 */
function mountBoard(props = {}, isBoard = true) {
	return mount(CnBoardView, {
		attachTo: document.body,
		props: { rows: ROWS, statusFieldSchema: FIELD, statusField: 'status', cardFields: ['title', 'identifier'], ...props },
		global: { provide: isBoard ? { cnLook: 'board' } : {} },
	})
}

const col = (w, key) => w.find(`[data-column="${key}"]`)

describe('CnBoardView: the look switch', () => {
	let w
	afterEach(() => w?.unmount())

	it('adds the board class only in the board look', () => {
		w = mountBoard()
		expect(w.classes()).toContain('cn-board-view--board')
		w.unmount()
		w = mountBoard({}, false)
		expect(w.classes()).not.toContain('cn-board-view--board')
		// Today's markup: a h3 header, the Open button and the Move to select.
		expect(w.find('h3.cn-board-view__column-header').exists()).toBe(true)
		expect(w.find('[data-testid="cn-board-card-open"]').element.tagName).toBe('BUTTON')
		expect(w.find('[data-testid="cn-board-move"]').exists()).toBe(false)
	})
})

describe('the board column header', () => {
	let w
	afterEach(() => w?.unmount())

	it('is an h2 with a dot, the label and a count badge', () => {
		w = mountBoard()
		const header = col(w, 'received').find('h2')
		expect(header.exists()).toBe(true)
		expect(header.find('[data-testid="cn-board-dot"]').exists()).toBe(true)
		expect(header.text()).toContain('Received')
		expect(header.find('[data-testid="cn-board-count"]').text()).toBe('3')
	})

	it('takes the dot colour from colorField, else the state colour, else the muted text', () => {
		w = mountBoard({ colorField: 'tone' })
		expect(col(w, 'received').find('[data-testid="cn-board-dot"]').attributes('style')).toContain('rgb(119, 170, 51)')
		w.unmount()
		w = mountBoard()
		expect(col(w, 'received').find('[data-testid="cn-board-dot"]').attributes('style')).toContain('var(--color-primary-element)')
		expect(col(w, 'doing').find('[data-testid="cn-board-dot"]').attributes('style')).toContain('rgb(91, 75, 179)')
		expect(col(w, 'decision').find('[data-testid="cn-board-dot"]').attributes('style')).toContain('var(--color-text-maxcontrast)')
	})

	it('resolves the colour fallbacks on their own', () => {
		expect(resolveStageColor('')).toBe('var(--color-text-maxcontrast)')
		expect(resolveStageColor(undefined)).toBe('var(--color-text-maxcontrast)')
		expect(resolveStageColor('success')).toBe('var(--color-success)')
		expect(resolveStageColor('#abc123')).toBe('#abc123')
		const { columns } = buildBoardColumns({ field: FIELD, rows: [], statusField: 'status', colorField: 'tone' })
		expect(columns.map((c) => c.color)).toEqual(['#7a3', '#5b4bb3', ''])
	})

	it('shows the column sum under the heading, formatted', () => {
		w = mountBoard({ sumField: 'amount', sumFormat: { style: 'currency', currency: 'EUR', decimals: 2 } })
		const sum = col(w, 'received').find('[data-testid="cn-board-sum"]')
		expect(sum.text().replace(/\s/g, ' ')).toMatch(/300\.00/)
		expect(sum.text()).toMatch(/€|EUR/)
		w.unmount()
		w = mountBoard()
		expect(w.find('[data-testid="cn-board-sum"]').exists()).toBe(false)
	})
})

describe('the board card anatomy', () => {
	let w
	afterEach(() => w?.unmount())

	it('renders every role of the DqWerkbord card', () => {
		w = mountBoard({
			cardRoles: CARD,
			dueRule: { field: 'deadline', variantWhen: [{ op: 'lt', value: 0, variant: 'error' }, { op: 'lte', value: 0, variant: 'error' }, { op: 'lte', value: 3, variant: 'warning' }] },
		})
		const card = w.find('[data-card-id="1"][data-testid="cn-board-card"]')
		expect(card.find('[data-testid="cn-board-card-open"]').text()).toBe('Report noise A16')
		expect(card.find('[data-testid="cn-board-card-sub"]').text()).toBe('2026-0083 · R. Smit')
		expect(card.find('[data-testid="cn-board-card-pill"]').text()).toBe('Melding')
		expect(card.find('[data-testid="cn-board-card-due"]').text()).toBe('Due today')
		expect(card.find('[data-testid="cn-board-card-owner"]').text()).toBe('AB')
		expect(card.find('[data-testid="cn-board-card-owner"]').attributes('title')).toBe('Anouk Bakker')
		expect(card.classes()).toContain('cn-board-view__card--overdue')
	})

	it('drops an empty role and its separator', () => {
		w = mountBoard({ cardRoles: CARD })
		const second = w.find('[data-card-id="2"][data-testid="cn-board-card"]')
		expect(second.find('[data-testid="cn-board-card-sub"]').text()).toBe('2026-0085')
		expect(second.find('[data-testid="cn-board-card-owner"]').exists()).toBe(false)
		const third = w.find('[data-card-id="3"][data-testid="cn-board-card"]')
		expect(third.find('[data-testid="cn-board-card-sub"]').exists()).toBe(false)
		expect(third.find('[data-testid="cn-board-card-pill"]').exists()).toBe(false)
		expect(third.find('[data-testid="cn-board-card-footer"]').exists()).toBe(false)
	})

	it('marks a past date late, in words and with the edge', () => {
		w = mountBoard({ cardRoles: CARD })
		const late = w.find('[data-card-id="4"][data-testid="cn-board-card"]')
		expect(late.find('[data-testid="cn-board-card-due"]').text()).toMatch(/^Overdue /)
		expect(late.classes()).toContain('cn-board-view__card--overdue')
		const far = w.find('[data-card-id="2"][data-testid="cn-board-card"]')
		expect(far.find('[data-testid="cn-board-card-due"]').text()).toMatch(/^Due /)
		expect(far.classes()).not.toContain('cn-board-view__card--overdue')
	})

	it('falls back to cardFields: the first is the title, the rest the sub line', () => {
		w = mountBoard({ cardFields: ['title', 'identifier', 'requester'] })
		const card = w.find('[data-card-id="1"][data-testid="cn-board-card"]')
		expect(card.find('[data-testid="cn-board-card-open"]').text()).toBe('Report noise A16')
		expect(card.find('[data-testid="cn-board-card-sub"]').text()).toBe('2026-0083 · R. Smit')
	})

	it('maps a pill value to a badge variant', () => {
		w = mountBoard({ cardRoles: { ...CARD, pillColors: { Melding: 'warning' } } })
		const pill = w.find('[data-card-id="1"] [data-testid="cn-board-card-pill"]')
		expect(pill.classes().join(' ')).toContain('warning')
	})
})

describe('the card shows no form controls at rest', () => {
	let w
	afterEach(() => w?.unmount())

	it('renders no select and no Open button, and keeps the card a listitem', () => {
		const runTransition = jest.fn(async () => ({ outcome: 'moved' }))
		w = mountBoard({ cardRoles: CARD, runTransition })
		expect(w.find('select').exists()).toBe(false)
		expect(w.text()).not.toContain('Move to')
		const card = w.find('[data-testid="cn-board-card"]')
		expect(card.attributes('role')).toBe('listitem')
		expect(card.element.hasAttribute('tabindex')).toBe(false)
		expect(card.find('[role="button"]').exists()).toBe(false)
		expect(card.find('[data-testid="cn-board-card-menu"]').attributes('aria-haspopup')).toBe('menu')
	})

	it('moves with one transition call when a column is picked from the menu', async () => {
		const runTransition = jest.fn(async ({ card, toKey }) => ({ ...card, status: toKey }))
		w = mountBoard({ cardRoles: CARD, runTransition })
		const card = w.find('[data-card-id="1"][data-testid="cn-board-card"]')
		await card.find('[data-testid="cn-board-card-menu"]').trigger('click')
		const items = card.findAll('[data-testid="cn-board-menu-move"]')
		expect(items.map((i) => i.attributes('data-target'))).toEqual(['doing', 'decision'])
		await items[1].trigger('click')
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(runTransition).toHaveBeenCalledTimes(1)
		expect(runTransition.mock.calls[0][0].card.id).toBe(1)
		expect(runTransition.mock.calls[0][0].toKey).toBe('decision')
		expect(w.emitted('moved')).toHaveLength(1)
		expect(card.find('[data-testid="cn-board-card-menu-list"]').exists()).toBe(false)
	})

	it('opens the same menu on the M key from a control inside the card', async () => {
		const runTransition = jest.fn(async () => ({ outcome: 'moved' }))
		w = mountBoard({ cardRoles: CARD, runTransition })
		const card = w.find('[data-card-id="1"][data-testid="cn-board-card"]')
		expect(card.find('[data-testid="cn-board-card-menu-list"]').exists()).toBe(false)
		await card.find('[data-testid="cn-board-card-open"]').trigger('keydown', { key: 'm' })
		expect(card.find('[data-testid="cn-board-card-menu-list"]').exists()).toBe(true)
		await card.find('[data-testid="cn-board-card-menu-list"]').trigger('keydown', { key: 'Escape' })
		expect(card.find('[data-testid="cn-board-card-menu-list"]').exists()).toBe(false)
	})

	it('does not offer Move to, and ignores M, on a read-only board', async () => {
		w = mountBoard({ cardRoles: CARD })
		const card = w.find('[data-card-id="1"][data-testid="cn-board-card"]')
		await card.find('[data-testid="cn-board-card-open"]').trigger('keydown', { key: 'M' })
		expect(card.find('[data-testid="cn-board-card-menu-list"]').exists()).toBe(false)
		await card.find('[data-testid="cn-board-card-menu"]').trigger('click')
		expect(card.find('[data-testid="cn-board-menu-move"]').exists()).toBe(false)
		expect(card.find('[data-testid="cn-board-menu-new-tab"]').exists()).toBe(true)
	})

	it('opens on the title link and in a new tab from the menu, both through card-click', async () => {
		w = mountBoard({ cardRoles: CARD })
		const card = w.find('[data-card-id="1"][data-testid="cn-board-card"]')
		await card.find('[data-testid="cn-board-card-open"]').trigger('click')
		expect(w.emitted('card-click')).toHaveLength(1)
		await card.find('[data-testid="cn-board-card-menu"]').trigger('click')
		await card.find('[data-testid="cn-board-menu-new-tab"]').trigger('click')
		expect(w.emitted('card-click')).toHaveLength(2)
		expect(w.emitted('card-click')[1][1].ctrlKey).toBe(true)
		await card.find('[data-testid="cn-board-card-open"]').trigger('auxclick', { button: 1 })
		expect(w.emitted('card-aux-click')).toHaveLength(1)
	})

	it('keeps the select and the Open button without the board look', async () => {
		const runTransition = jest.fn(async () => ({ outcome: 'moved' }))
		w = mountBoard({ cardRoles: CARD, runTransition }, false)
		expect(w.findAll('select[data-testid="cn-board-move"]').length).toBe(ROWS.length)
		await w.find('[data-card-id="1"] select').setValue('decision')
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(runTransition).toHaveBeenCalledTimes(1)
	})
})

describe('a long column is cut with a show-more button', () => {
	let w
	afterEach(() => w?.unmount())

	const many = Array.from({ length: 19 }, (_, i) => ({ id: 100 + i, status: 'doing', title: `Case ${i}` }))

	it('draws four of nineteen, a Show 15 more button, and the total in the badge', async () => {
		w = mountBoard({ rows: many, columnLimit: 4 })
		const column = col(w, 'doing')
		expect(column.findAll('[data-testid="cn-board-card"]')).toHaveLength(4)
		expect(column.find('[data-testid="cn-board-show-more"]').text()).toBe('Show 15 more')
		expect(column.find('[data-testid="cn-board-count"]').text()).toBe('19')
		await column.find('[data-testid="cn-board-show-more"]').trigger('click')
		expect(column.findAll('[data-testid="cn-board-card"]')).toHaveLength(19)
		expect(column.find('[data-testid="cn-board-show-more"]').exists()).toBe(false)
	})

	it('reveals one column only', async () => {
		w = mountBoard({ rows: [...many, ...Array.from({ length: 6 }, (_, i) => ({ id: 200 + i, status: 'received', title: `R${i}` }))], columnLimit: 4 })
		await col(w, 'doing').find('[data-testid="cn-board-show-more"]').trigger('click')
		expect(col(w, 'received').findAll('[data-testid="cn-board-card"]')).toHaveLength(4)
		expect(col(w, 'received').find('[data-testid="cn-board-show-more"]').text()).toBe('Show 2 more')
	})

	it('asks the host for the next page when the board is paged', async () => {
		w = mountBoard({ rows: many, columnLimit: 4, paged: true })
		await col(w, 'doing').find('[data-testid="cn-board-show-more"]').trigger('click')
		expect(w.emitted('load-more')).toEqual([[{ columnKey: 'doing' }]])
	})

	it('draws every card without a limit', () => {
		w = mountBoard({ rows: many })
		expect(col(w, 'doing').findAll('[data-testid="cn-board-card"]')).toHaveLength(19)
		expect(w.find('[data-testid="cn-board-show-more"]').exists()).toBe(false)
	})
})
