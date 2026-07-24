/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectKanban: column derivation/ordering precedence
 * (columnOrder > schema enum > discovered values), per-column "load more"
 * pagination (backend-paginated and locally-derived modes), and the
 * optimistic move + rollback-on-rejection contract (REQ-VIEW-KANBAN-03).
 */
import { mount } from '@vue/test-utils'
import CnObjectKanban from '../../src/components/CnObjectKanban/CnObjectKanban.vue'

// Stub vuedraggable so the board mounts without Sortable; keeps `:list` bound
// so template card iteration and vm-level drag helpers are still exercised.
const DraggableStub = {
	name: 'draggable',
	props: ['list', 'group'],
	template: '<div><slot /></div>',
}

function mountKanban(propsData) {
	return mount(CnObjectKanban, {
		propsData,
		stubs: { draggable: DraggableStub },
	})
}

describe('CnObjectKanban — column derivation', () => {
	const objects = [
		{ id: '1', status: 'doing', title: 'B' },
		{ id: '2', status: 'todo', title: 'A' },
		{ id: '3', status: 'done', title: 'C' },
		{ id: '4', status: 'todo', title: 'D' },
	]

	it('columnOrder takes precedence over everything else', () => {
		const wrapper = mountKanban({
			objects,
			groupByField: 'status',
			columnOrder: ['done', 'doing', 'todo'],
			schema: { properties: { status: { enum: ['todo', 'doing', 'done'] } } },
		})
		expect(wrapper.vm.localColumns.map((c) => c.value)).toEqual(['done', 'doing', 'todo'])
	})

	it('falls back to the schema enum order when no columnOrder is given', () => {
		const wrapper = mountKanban({
			objects,
			groupByField: 'status',
			schema: { properties: { status: { enum: ['todo', 'doing', 'done'] } } },
		})
		expect(wrapper.vm.localColumns.map((c) => c.value)).toEqual(['todo', 'doing', 'done'])
	})

	it('discovers distinct values (first-seen order) when neither columnOrder nor enum is given', () => {
		const wrapper = mountKanban({ objects, groupByField: 'status' })
		// First-seen order in `objects`: doing, todo, done
		expect(wrapper.vm.localColumns.map((c) => c.value)).toEqual(['doing', 'todo', 'done'])
	})

	it('groups cards under their column and reports the full column total', () => {
		const wrapper = mountKanban({
			objects,
			groupByField: 'status',
			columnOrder: ['todo', 'doing', 'done'],
		})
		const todoColumn = wrapper.vm.localColumns.find((c) => c.value === 'todo')
		expect(todoColumn.cards.map((c) => c.id)).toEqual(['2', '4'])
		expect(todoColumn.total).toBe(2)
	})

	it('accepts pre-built backend columns (GET .../kanban shape) directly, unmodified by derivation', () => {
		const wrapper = mountKanban({
			groupByField: 'status',
			columns: [
				{ value: 'todo', cards: [{ id: '1' }], total: 5, limit: 1, offset: 0 },
				{ value: 'done', cards: [{ id: '2' }], total: 1, limit: 1, offset: 0 },
			],
		})
		expect(wrapper.vm.localColumns.map((c) => c.value)).toEqual(['todo', 'done'])
		expect(wrapper.vm.localColumns[0].total).toBe(5)
	})
})

describe('CnObjectKanban — pagination ("load more")', () => {
	it('local mode: reveals the next page from the full filtered set and emits load-more', () => {
		const objects = Array.from({ length: 5 }, (_, i) => ({ id: String(i), status: 'todo' }))
		const wrapper = mountKanban({ objects, groupByField: 'status', pageSize: 2 })
		const column = wrapper.vm.localColumns[0]
		expect(column.cards.length).toBe(2)
		expect(wrapper.vm.hasMore(column)).toBe(true)

		wrapper.vm.onLoadMore(column)

		expect(column.cards.length).toBe(4)
		expect(wrapper.emitted('load-more')).toBeTruthy()
		expect(wrapper.emitted('load-more')[0]).toEqual([{ value: 'todo', offset: 4 }])
	})

	it('backend-paginated mode: does not slice locally, only emits load-more with the current offset', () => {
		const wrapper = mountKanban({
			groupByField: 'status',
			columns: [{ value: 'todo', cards: [{ id: '1' }, { id: '2' }], total: 10, limit: 2, offset: 0 }],
		})
		const column = wrapper.vm.localColumns[0]
		expect(wrapper.vm.hasMore(column)).toBe(true)

		wrapper.vm.onLoadMore(column)

		expect(column.cards.length).toBe(2) // unchanged — host owns pagination
		expect(wrapper.emitted('load-more')[0]).toEqual([{ value: 'todo', offset: 2 }])
	})

	it('hasMore is false once every card is loaded', () => {
		const objects = [{ id: '1', status: 'todo' }]
		const wrapper = mountKanban({ objects, groupByField: 'status', pageSize: 20 })
		expect(wrapper.vm.hasMore(wrapper.vm.localColumns[0])).toBe(false)
	})
})

describe('CnObjectKanban — move + rollback', () => {
	const objects = [
		{ id: '1', status: 'todo', title: 'A' },
		{ id: '2', status: 'doing', title: 'B' },
	]

	function dragCardAcrossColumns(wrapper, cardId, fromValue, toValue) {
		const fromColumn = wrapper.vm.localColumns.find((c) => c.value === fromValue)
		const toColumn = wrapper.vm.localColumns.find((c) => c.value === toValue)
		const card = fromColumn.cards.find((c) => c.id === cardId)

		// Mirror vuedraggable's own effect (splice out of source, into destination)
		// then fire the same lifecycle hooks CnObjectKanban listens to.
		fromColumn.cards.splice(fromColumn.cards.indexOf(card), 1)
		toColumn.cards.push(card)
		wrapper.vm.onDragStart(fromColumn)
		wrapper.vm.onColumnChange({ added: { element: card, newIndex: toColumn.cards.length - 1 } }, toColumn)
		return card
	}

	it('emits move with the object, groupByField, and both column values', () => {
		const wrapper = mountKanban({ objects, groupByField: 'status', columnOrder: ['todo', 'doing'] })
		const card = dragCardAcrossColumns(wrapper, '1', 'todo', 'doing')

		expect(wrapper.emitted('move')).toBeTruthy()
		expect(wrapper.emitted('move')[0]).toEqual([{
			object: card,
			groupByField: 'status',
			fromValue: 'todo',
			toValue: 'doing',
		}])
	})

	it('optimistically moves the card into the destination column immediately', () => {
		const wrapper = mountKanban({ objects, groupByField: 'status', columnOrder: ['todo', 'doing'] })
		dragCardAcrossColumns(wrapper, '1', 'todo', 'doing')

		const doingColumn = wrapper.vm.localColumns.find((c) => c.value === 'doing')
		const todoColumn = wrapper.vm.localColumns.find((c) => c.value === 'todo')
		expect(doingColumn.cards.map((c) => c.id)).toEqual(['2', '1'])
		expect(todoColumn.cards.map((c) => c.id)).toEqual([])
	})

	it('rejectMove rolls the card back to its origin column and emits move-rejected with the reason', () => {
		const wrapper = mountKanban({ objects, groupByField: 'status', columnOrder: ['todo', 'doing'] })
		dragCardAcrossColumns(wrapper, '1', 'todo', 'doing')

		wrapper.vm.rejectMove('1', 'Illegal lifecycle transition: done -> todo')

		const doingColumn = wrapper.vm.localColumns.find((c) => c.value === 'doing')
		const todoColumn = wrapper.vm.localColumns.find((c) => c.value === 'todo')
		expect(doingColumn.cards.map((c) => c.id)).toEqual(['2'])
		expect(todoColumn.cards.map((c) => c.id)).toEqual(['1'])

		expect(wrapper.emitted('move-rejected')).toBeTruthy()
		expect(wrapper.emitted('move-rejected')[0][0]).toMatchObject({
			fromValue: 'todo',
			toValue: 'doing',
			reason: 'Illegal lifecycle transition: done -> todo',
		})
	})

	it('resolveMove clears the pending state without moving the card again', () => {
		const wrapper = mountKanban({ objects, groupByField: 'status', columnOrder: ['todo', 'doing'] })
		const card = dragCardAcrossColumns(wrapper, '1', 'todo', 'doing')
		expect(wrapper.vm.isPending(card)).toBe(true)

		wrapper.vm.resolveMove('1')

		expect(wrapper.vm.isPending(card)).toBe(false)
		const doingColumn = wrapper.vm.localColumns.find((c) => c.value === 'doing')
		expect(doingColumn.cards.map((c) => c.id)).toEqual(['2', '1'])
	})

	it('rejectMove on an unknown id is a no-op', () => {
		const wrapper = mountKanban({ objects, groupByField: 'status', columnOrder: ['todo', 'doing'] })
		expect(() => wrapper.vm.rejectMove('does-not-exist', 'nope')).not.toThrow()
		expect(wrapper.emitted('move-rejected')).toBeFalsy()
	})
})
