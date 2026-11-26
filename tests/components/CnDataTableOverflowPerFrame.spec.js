/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The table measures its horizontal overflow once per frame. The reads force a
 * layout, and a list that fills in (rows, then lookups, then counts) updates
 * several times before it paints.
 */
const { mount } = require('@vue/test-utils')
const { nextTick } = require('vue')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const CellStub = { props: ['value'], template: '<span>{{ value }}</span>' }

describe('CnDataTable: overflow measured once per frame', () => {
	let frames

	beforeEach(() => {
		frames = []
		global.requestAnimationFrame = jest.fn((cb) => frames.push(cb))
		global.cancelAnimationFrame = jest.fn()
	})

	afterEach(() => {
		delete global.requestAnimationFrame
		delete global.cancelAnimationFrame
	})

	it('folds several updates before a frame into one measurement', async () => {
		const w = mount(CnDataTable, {
			props: { rows: [{ id: '1', title: 'A' }], columns: [{ key: 'title', label: 'Title' }], rowKey: 'id' },
			global: { stubs: { CnCellRenderer: CellStub } },
		})
		const measure = jest.spyOn(w.vm, 'measureScrollOverflow')

		await w.setProps({ rows: [{ id: '1', title: 'A' }, { id: '2', title: 'B' }] })
		await w.setProps({ rows: [{ id: '1', title: 'A' }, { id: '2', title: 'B' }, { id: '3', title: 'C' }] })
		await nextTick()

		expect(measure).not.toHaveBeenCalled()
		expect(frames).toHaveLength(1)

		frames.shift()()
		expect(measure).toHaveBeenCalledTimes(1)
	})

	it('drops a pending measurement when the table goes away', async () => {
		const w = mount(CnDataTable, {
			props: { rows: [{ id: '1', title: 'A' }], columns: [{ key: 'title', label: 'Title' }], rowKey: 'id' },
			global: { stubs: { CnCellRenderer: CellStub } },
		})
		await w.setProps({ rows: [] })
		w.unmount()

		expect(global.cancelAnimationFrame).toHaveBeenCalledTimes(1)
	})

	describe('on mount', () => {
		const props = { rows: [{ id: '1', title: 'A' }], columns: [{ key: 'title', label: 'Title' }], rowKey: 'id' }
		const global_ = { stubs: { CnCellRenderer: CellStub } }
		let measured

		beforeEach(() => {
			measured = 0
			jest.spyOn(CnDataTable.methods, 'measureScrollOverflow').mockImplementation(() => {
				measured++
			})
		})

		afterEach(() => {
			jest.restoreAllMocks()
			delete global.ResizeObserver
		})

		it('leaves the first measurement to the ResizeObserver instead of forcing a layout while mounting', () => {
			const observers = []
			global.ResizeObserver = class {
				constructor(callback) {
					this.callback = callback
					this.observe = jest.fn()
					this.disconnect = jest.fn()
					observers.push(this)
				}
			}

			mount(CnDataTable, { props, global: global_ })

			expect(measured).toBe(0)
			expect(observers).toHaveLength(1)
			expect(observers[0].observe).toHaveBeenCalled()
			observers[0].callback([])
			expect(measured).toBe(1)
		})

		it('measures at once where there is no ResizeObserver', () => {
			delete global.ResizeObserver
			mount(CnDataTable, { props, global: global_ })
			expect(measured).toBe(1)
		})
	})
})
