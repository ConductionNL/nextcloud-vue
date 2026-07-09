/**
 * Unit tests for the renameDataSourceKeys transform (audit items 11/25).
 */

import { renameDataSourceKeys } from '../../../src/cli/transforms/renameDataSourceKeys.js'

describe('renameDataSourceKeys', () => {
	it('renames a bare entry-level source to dataSource', () => {
		const page = {
			id: 'p',
			widgets: [{ widgetKey: 'chart', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, source: 'orders' }],
		}
		const { page: out, count } = renameDataSourceKeys(page)
		expect(count).toBe(1)
		expect(out.widgets[0].dataSource).toBe('orders')
		expect(out.widgets[0].source).toBeUndefined()
	})

	it('renames content.source to dataSource and drops emptied content', () => {
		const page = {
			id: 'p',
			widgets: [{ widgetKey: 'chart', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, content: { source: 'pets' } }],
		}
		const { page: out } = renameDataSourceKeys(page)
		expect(out.widgets[0].dataSource).toBe('pets')
		expect(out.widgets[0].content).toBeUndefined()
	})

	it('keeps remaining content keys when only source is renamed', () => {
		const page = {
			id: 'p',
			widgets: [{ widgetKey: 'data', slot: 'body', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4, content: { source: 'pets', columns: 2 } }],
		}
		const { page: out } = renameDataSourceKeys(page)
		expect(out.widgets[0].dataSource).toBe('pets')
		expect(out.widgets[0].content).toEqual({ columns: 2 })
	})

	it('does NOT touch props.source (object-table ADR-049 query contract)', () => {
		const page = {
			id: 'p',
			widgets: [{
				widgetKey: 'object-table',
				slot: 'body',
				gridX: 0,
				gridY: 0,
				gridWidth: 12,
				gridHeight: 3,
				props: { title: 'Recent', source: { register: 'petstore', schema: 'order', limit: 5 } },
			}],
		}
		const { page: out, count } = renameDataSourceKeys(page)
		expect(count).toBe(0)
		expect(out).toBe(page)
		expect(out.widgets[0].props.source).toEqual({ register: 'petstore', schema: 'order', limit: 5 })
		expect(out.widgets[0].dataSource).toBeUndefined()
	})

	// --- Idempotence ---
	it('is a byte-identical no-op when nothing is renamable (same reference)', () => {
		const page = {
			id: 'p',
			widgets: [{ widgetKey: 'data', slot: 'body', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4, dataSource: 'pets' }],
		}
		const { page: out, count } = renameDataSourceKeys(page)
		expect(out).toBe(page)
		expect(count).toBe(0)
	})

	it('re-run on renamed output is byte-identical', () => {
		const page = { id: 'p', widgets: [{ widgetKey: 'chart', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, source: 'orders' }] }
		const first = renameDataSourceKeys(page).page
		const second = renameDataSourceKeys(first).page
		expect(JSON.stringify(second)).toBe(JSON.stringify(first))
	})
})
