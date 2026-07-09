/**
 * Unit tests for the convergeTypedWidgets transform (audit items 11/25).
 */

import { convergeTypedWidgets } from '../../../src/cli/transforms/convergeTypedWidgets.js'

describe('convergeTypedWidgets', () => {
	it('folds config.widgets + config.layout into canonical top-level widgets[]', () => {
		const page = {
			id: 'ExampleDetail',
			type: 'detail',
			config: {
				register: 'petstore',
				schema: 'pet',
				widgets: [
					{ id: 'w1', type: 'data', title: 'Details', content: { columns: 2 } },
					{ id: 'w2', type: 'related', title: 'Related' },
				],
				layout: [
					{ id: '1', widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4 },
					{ id: '2', widgetId: 'w2', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 4 },
				],
			},
		}
		const { page: out, count } = convergeTypedWidgets(page)
		expect(count).toBe(2)
		expect(out.config.widgets).toBeUndefined()
		expect(out.config.layout).toBeUndefined()
		expect(out.config.register).toBe('petstore')
		expect(out.widgets).toHaveLength(2)
		expect(out.widgets[0]).toMatchObject({
			widgetKey: 'data', slot: 'body', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4,
		})
		expect(out.widgets[0].props).toEqual({ title: 'Details', content: { columns: 2 } })
		expect(out.widgets[1].widgetKey).toBe('related')
		expect(out.widgets[1].gridX).toBe(8)
	})

	it('folds top-level dialect-B widgets:[{id,type}] + config.layout (spec scenario, terse x/y/w/h)', () => {
		const page = {
			id: 'dash',
			type: 'dashboard',
			widgets: [{ id: 'w1', type: 'stat', title: 'Open' }],
			config: { layout: [{ i: 'w1', x: 0, y: 0, w: 3, h: 2 }] },
		}
		const { page: out } = convergeTypedWidgets(page)
		expect(out.widgets).toEqual([
			{ widgetKey: 'stat', slot: 'body', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2, props: { title: 'Open' } },
		])
		expect(out.config.layout).toBeUndefined()
	})

	it('preserves already-canonical top-level entries and keeps dataSource at entry level', () => {
		const page = {
			id: 'p',
			type: 'index',
			widgets: [{ widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }],
			config: {
				widgets: [{ id: 'w1', type: 'chart', dataSource: 'orders' }],
				layout: [{ widgetId: 'w1', gridX: 0, gridY: 3, gridWidth: 6, gridHeight: 4 }],
			},
		}
		const { page: out } = convergeTypedWidgets(page)
		expect(out.widgets).toHaveLength(2)
		expect(out.widgets[0].widgetKey).toBe('object-table') // canonical entry kept first
		expect(out.widgets[1].widgetKey).toBe('chart')
		expect(out.widgets[1].dataSource).toBe('orders')
	})

	it('auto-places widgets that have no matching layout entry', () => {
		const page = {
			id: 'p',
			type: 'detail',
			config: { widgets: [{ id: 'a', type: 'data' }, { id: 'b', type: 'related' }], layout: [] },
		}
		const { page: out } = convergeTypedWidgets(page)
		expect(out.widgets[0]).toMatchObject({ gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 })
		expect(out.widgets[1].gridY).toBe(2) // stacked below the first (auto-row advanced)
	})

	// --- Idempotence ---
	it('is a byte-identical no-op on canonical input (returns same reference)', () => {
		const page = {
			id: 'p',
			type: 'detail',
			widgets: [{ widgetKey: 'data', slot: 'body', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4 }],
			config: { register: 'x', schema: 'y' },
		}
		const { page: out, count } = convergeTypedWidgets(page)
		expect(out).toBe(page)
		expect(count).toBe(0)
	})

	it('re-run on converted output is byte-identical', () => {
		const page = {
			id: 'p',
			type: 'detail',
			config: { widgets: [{ id: 'w1', type: 'data' }], layout: [{ widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4 }] },
		}
		const first = convergeTypedWidgets(page).page
		const second = convergeTypedWidgets(first).page
		expect(JSON.stringify(second)).toBe(JSON.stringify(first))
	})
})
