/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board as a component.
 *
 * The column order, the swimlanes and the transition contract are pure and
 * tested on their own. What is tested here is what a unit test of those cannot
 * see: that the gestures actually reach the contract, that the KEYBOARD one
 * does too, and that a refusal reaches the screen instead of the console.
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnBoardView = require('../../src/components/CnBoardView/CnBoardView.vue').default

const FIELD = { enum: ['open', 'doing', 'done'], enumLabels: { open: 'Open', doing: 'Doing', done: 'Done' } }
const ROWS = [
	{ id: 1, status: 'open', title: 'Een', who: 'alice' },
	{ id: 2, status: 'doing', title: 'Twee', who: 'bob' },
]

/**
 * Mount the board.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountBoard(props = {}) {
	return mount(CnBoardView, {
		props: {
			rows: ROWS,
			statusFieldSchema: FIELD,
			statusField: 'status',
			cardFields: ['title'],
			...props,
		},
	})
}

describe('the board renders what the helpers decided', () => {
	it('renders a column per stage, including the empty one', () => {
		const columns = mountBoard().findAll('[data-testid="cn-board-column"]')

		expect(columns.map((column) => column.attributes('data-column'))).toEqual([
			'open',
			'doing',
			'done',
		])
	})

	it('says so instead of drawing an empty board when the field has no stages', () => {
		// Told rather than shown three blank columns somebody has to diagnose.
		const wrapper = mountBoard({ statusFieldSchema: { type: 'string' } })

		expect(wrapper.find('[data-testid="cn-board-unusable"]').exists()).toBe(true)
		expect(wrapper.findAll('[data-testid="cn-board-column"]')).toHaveLength(0)
	})

	it('says a count is of one page when it is', () => {
		// A page count shown as a total is a number somebody quotes.
		const wrapper = mountBoard({ paged: true })

		expect(wrapper.find('[data-testid="cn-board-count"]').text()).toContain('on this page')
	})
})

describe('moving a card', () => {
	it('asks the host transition and never writes the status field', async () => {
		const runTransition = jest.fn(async ({ card }) => ({ ...card, status: 'done' }))
		const wrapper = mountBoard({ runTransition })

		await wrapper.findAll('[data-testid="cn-board-card"]')[0].trigger('dragstart')
		await wrapper.findAll('[data-testid="cn-board-column"]')[2].trigger('drop')

		expect(runTransition).toHaveBeenCalledWith({ card: ROWS[0], toKey: 'done' })
		expect(ROWS[0].status).toBe('open')
		expect(wrapper.emitted().moved[0][0].toKey).toBe('done')
	})

	it('runs the same move from the keyboard', async () => {
		// A board whose only move is a drag is a board a keyboard user cannot
		// use, and "drag the card" is not an instruction they can follow.
		const runTransition = jest.fn(async ({ card }) => ({ ...card, status: 'done' }))
		const wrapper = mountBoard({ runTransition })

		const select = wrapper.findAll('[data-testid="cn-board-move"]')[0]
		select.element.value = 'done'
		await select.trigger('change')

		expect(runTransition).toHaveBeenCalledWith({ card: ROWS[0], toKey: 'done' })
	})

	it('offers no gesture at all when the host supplies no transition', () => {
		// A gesture that cannot do anything is worse than no gesture.
		const wrapper = mountBoard()

		expect(wrapper.findAll('[data-testid="cn-board-move"]')).toHaveLength(0)
		// Vue renders :draggable="false" as the string "false", which is what
		// the DOM honours; asserting absence would pass on a board that was
		// draggable and merely rendered the attribute differently.
		expect(wrapper.findAll('[data-testid="cn-board-card"]')[0].attributes('draggable')).toBe('false')
	})
})

describe('a refusal reaches the screen', () => {
	it('shows the sentence the guard gave', async () => {
		const runTransition = async () => {
			const error = new Error('generic')
			error.response = { data: { message: 'Een zaak zonder besluit kan niet worden afgesloten.' } }
			throw error
		}
		const wrapper = mountBoard({ runTransition })

		await wrapper.findAll('[data-testid="cn-board-card"]')[0].trigger('dragstart')
		await wrapper.findAll('[data-testid="cn-board-column"]')[2].trigger('drop')
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-board-refusal"]').text())
			.toBe('Een zaak zonder besluit kan niet worden afgesloten.')
	})

	it('uses its own words only when the guard gave none', async () => {
		const wrapper = mountBoard({
			runTransition: async () => {
				throw new Error('')
			},
		})

		await wrapper.findAll('[data-testid="cn-board-card"]')[0].trigger('dragstart')
		await wrapper.findAll('[data-testid="cn-board-column"]')[2].trigger('drop')
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-board-refusal"]').text()).toBe('That move was refused.')
	})

	it('says so when somebody else moved the card', async () => {
		const runTransition = jest.fn()
		const wrapper = mountBoard({
			runTransition,
			reread: async (card) => ({ ...card, status: 'done' }),
		})

		await wrapper.findAll('[data-testid="cn-board-card"]')[0].trigger('dragstart')
		await wrapper.findAll('[data-testid="cn-board-column"]')[1].trigger('drop')
		await wrapper.vm.$nextTick()

		expect(runTransition).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-board-refusal"]').text()).toContain('Somebody else moved')
	})
})

describe('swimlanes', () => {
	it('renders one lane with no header when no field is named', () => {
		const wrapper = mountBoard()

		expect(wrapper.findAll('[data-testid="cn-board-lane"]')).toHaveLength(1)
		expect(wrapper.findAll('[data-testid="cn-board-lane-header"]')).toHaveLength(0)
	})

	it('renders a row per value, and collapses one while the reader is here', async () => {
		const wrapper = mountBoard({ swimlaneField: 'who' })

		const headers = wrapper.findAll('[data-testid="cn-board-lane-header"]')
		expect(headers.map((header) => header.text())).toEqual(['alice (1)', 'bob (1)'])
		expect(headers[0].attributes('aria-expanded')).toBe('true')

		await headers[0].trigger('click')

		expect(wrapper.findAll('[data-testid="cn-board-lane-header"]')[0].attributes('aria-expanded')).toBe('false')
	})
})
