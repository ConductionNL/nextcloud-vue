/**
 * Unit tests for mergeDashboardWidgetsAndLayout transform.
 */

import { mergeDashboardWidgetsAndLayout } from '../../../src/cli/transforms/mergeDashboardWidgetsAndLayout.js'

describe('mergeDashboardWidgetsAndLayout', () => {
	it('returns page unchanged when type is not dashboard', () => {
		const page = { id: 'test', type: 'index', title: 'Test', route: '/test' }
		const { page: result, count } = mergeDashboardWidgetsAndLayout(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('returns page unchanged when config has no widgets or layout', () => {
		const page = { id: 'dash', type: 'dashboard', title: 'Dashboard', route: '/', config: {} }
		const { page: result, count } = mergeDashboardWidgetsAndLayout(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('merges widgets and layout into top-level widgets[]', () => {
		const page = {
			id: 'dash',
			type: 'dashboard',
			title: 'Dashboard',
			route: '/',
			config: {
				widgets: [
					{ id: 'w1', type: 'counter', title: 'Count' },
					{ id: 'w2', type: 'chart', title: 'Chart' },
				],
				layout: [
					{ id: 'w1', widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
					{ id: 'w2', widgetId: 'w2', gridX: 3, gridY: 0, gridWidth: 6, gridHeight: 4 },
				],
			},
		}

		const { page: result, count } = mergeDashboardWidgetsAndLayout(page)
		expect(count).toBe(2)
		expect(result.widgets).toHaveLength(2)
		expect(result.config.widgets).toBeUndefined()
		expect(result.config.layout).toBeUndefined()

		const w1 = result.widgets[0]
		expect(w1.widgetKey).toBe('counter')
		expect(w1.slot).toBe('body')
		expect(w1.gridX).toBe(0)
		expect(w1.gridY).toBe(0)
		expect(w1.gridWidth).toBe(3)
		expect(w1.gridHeight).toBe(2)
		expect(w1.props.title).toBe('Count')

		const w2 = result.widgets[1]
		expect(w2.widgetKey).toBe('chart')
		expect(w2.gridX).toBe(3)
		expect(w2.gridWidth).toBe(6)
	})

	it('uses default grid coords when no matching layout entry exists', () => {
		const page = {
			id: 'dash',
			type: 'dashboard',
			title: 'Dashboard',
			route: '/',
			config: {
				widgets: [{ id: 'w1', type: 'counter', title: 'Count' }],
				layout: [],
			},
		}

		const { page: result, count } = mergeDashboardWidgetsAndLayout(page)
		expect(count).toBe(1)
		const w = result.widgets[0]
		expect(w.gridX).toBe(0)
		expect(w.gridWidth).toBe(2)
		expect(w.gridHeight).toBe(2)
	})

	it('preserves dataSource on merged widget', () => {
		const page = {
			id: 'dash',
			type: 'dashboard',
			title: 'Dashboard',
			route: '/',
			config: {
				widgets: [
					{
						id: 'w1',
						type: 'counter',
						title: 'Count',
						dataSource: { register: 'cases', schema: 'case', aggregate: 'count' },
					},
				],
				layout: [
					{ id: 'w1', widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 },
				],
			},
		}

		const { page: result } = mergeDashboardWidgetsAndLayout(page)
		expect(result.widgets[0].dataSource).toEqual({
			register: 'cases',
			schema: 'case',
			aggregate: 'count',
		})
	})

	it('preserves @resolve: fields on merged widget', () => {
		const page = {
			id: 'dash',
			type: 'dashboard',
			title: 'Dashboard',
			route: '/',
			config: {
				widgets: [{ id: 'w1', type: 'counter', '@resolve:register': 'some-register' }],
				layout: [{ id: 'w1', widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 }],
			},
		}

		const { page: result } = mergeDashboardWidgetsAndLayout(page)
		expect(result.widgets[0]['@resolve:register']).toBe('some-register')
	})

	it('carries forward other config keys (e.g. register, schema)', () => {
		const page = {
			id: 'dash',
			type: 'dashboard',
			title: 'Dashboard',
			route: '/',
			config: {
				register: 'my-register',
				schema: 'my-schema',
				widgets: [{ id: 'w1', type: 'counter', title: 'Count' }],
				layout: [{ id: 'w1', widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 }],
			},
		}

		const { page: result } = mergeDashboardWidgetsAndLayout(page)
		expect(result.config.register).toBe('my-register')
		expect(result.config.schema).toBe('my-schema')
	})

	it('appends to existing page.widgets when already present', () => {
		const page = {
			id: 'dash',
			type: 'dashboard',
			title: 'Dashboard',
			route: '/',
			widgets: [{ widgetKey: 'existing', slot: 'body', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 1 }],
			config: {
				widgets: [{ id: 'w1', type: 'counter', title: 'Count' }],
				layout: [{ id: 'w1', widgetId: 'w1', gridX: 0, gridY: 1, gridWidth: 2, gridHeight: 2 }],
			},
		}

		const { page: result } = mergeDashboardWidgetsAndLayout(page)
		expect(result.widgets).toHaveLength(2)
		expect(result.widgets[0].widgetKey).toBe('existing')
		expect(result.widgets[1].widgetKey).toBe('counter')
	})
})
