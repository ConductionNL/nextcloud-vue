/**
 * Unit tests for liftSidebarTabWidgets transform.
 */

import { liftSidebarTabWidgets } from '../../../src/cli/transforms/liftSidebarTabWidgets.js'

describe('liftSidebarTabWidgets', () => {
	it('returns page unchanged when no sidebarTabs', () => {
		const page = { id: 'p', type: 'detail', title: 'P', route: '/p', config: {} }
		const { page: result, count } = liftSidebarTabWidgets(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('lifts widgets from sidebarTabs to page.widgets with slot:"sidebar"', () => {
		const page = {
			id: 'detail',
			type: 'detail',
			title: 'Detail',
			route: '/detail/:id',
			config: {
				register: 'items',
				schema: 'item',
				sidebarTabs: [
					{
						id: 'overview',
						label: 'Overview',
						widgets: [{ type: 'data' }, { type: 'metadata' }],
					},
					{
						id: 'relations',
						label: 'Relations',
						widgets: [{ type: 'relation-list' }],
					},
				],
			},
		}

		const { page: result, count, unconvertedTabs } = liftSidebarTabWidgets(page)
		expect(count).toBe(3)
		expect(unconvertedTabs).toEqual([])
		expect(result.widgets).toHaveLength(3)
		expect(result.config.sidebarTabs).toBeUndefined()
		expect(result.config.register).toBe('items')

		const w1 = result.widgets[0]
		expect(w1.widgetKey).toBe('data')
		expect(w1.slot).toBe('sidebar')
		expect(w1.tabGroup).toBe('overview')
		expect(w1.gridWidth).toBe(1)

		const w3 = result.widgets[2]
		expect(w3.widgetKey).toBe('relation-list')
		expect(w3.tabGroup).toBe('relations')
	})

	it('retains component-only tabs in residual sidebarTabs and reports them', () => {
		const page = {
			id: 'detail',
			type: 'detail',
			title: 'Detail',
			route: '/detail/:id',
			config: {
				sidebarTabs: [
					{ id: 'data', label: 'Data', widgets: [{ type: 'data' }] },
					{ id: 'custom', label: 'Custom', component: 'MyCustomTab' },
				],
			},
		}

		const { page: result, count, unconvertedTabs } = liftSidebarTabWidgets(page)
		expect(count).toBe(1)
		expect(unconvertedTabs).toEqual(['custom'])
		// The custom tab should remain in sidebarTabs
		expect(result.config.sidebarTabs).toHaveLength(1)
		expect(result.config.sidebarTabs[0].id).toBe('custom')
	})

	it('sets gridY incrementally across tabs', () => {
		const page = {
			id: 'detail',
			type: 'detail',
			title: 'Detail',
			route: '/detail/:id',
			config: {
				sidebarTabs: [
					{ id: 'tab1', label: 'Tab1', widgets: [{ type: 'a' }, { type: 'b' }] },
					{ id: 'tab2', label: 'Tab2', widgets: [{ type: 'c' }] },
				],
			},
		}

		const { page: result } = liftSidebarTabWidgets(page)
		expect(result.widgets[0].gridY).toBe(0)
		expect(result.widgets[1].gridY).toBe(1)
		expect(result.widgets[2].gridY).toBe(2)
	})
})
