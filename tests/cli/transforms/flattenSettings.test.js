/**
 * Unit tests for flattenSettingsSectionWidgets and flattenSettingsTabs.
 */

import { flattenSettingsSectionWidgets } from '../../../src/cli/transforms/flattenSettingsSectionWidgets.js'
import { flattenSettingsTabs } from '../../../src/cli/transforms/flattenSettingsTabs.js'

describe('flattenSettingsSectionWidgets', () => {
	it('returns page unchanged when type is not settings', () => {
		const page = { id: 'p', type: 'index', title: 'P', route: '/p', config: {} }
		const { page: result, count } = flattenSettingsSectionWidgets(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('returns page unchanged when no sections', () => {
		const page = { id: 'p', type: 'settings', title: 'P', route: '/p', config: {} }
		const { page: result, count } = flattenSettingsSectionWidgets(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('flattens section widgets to slot:"section:<id>"', () => {
		const page = {
			id: 'settings',
			type: 'settings',
			title: 'Settings',
			route: '/settings',
			config: {
				saveEndpoint: '/api/settings',
				sections: [
					{
						title: 'General',
						id: 'general',
						widgets: [
							{ type: 'version-info', props: { appName: 'MyApp' } },
							{ type: 'update-check' },
						],
					},
					{
						title: 'Advanced',
						id: 'advanced',
						widgets: [{ type: 'debug-panel' }],
					},
				],
			},
		}

		const { page: result, count } = flattenSettingsSectionWidgets(page)
		expect(count).toBe(3)
		expect(result.config.sections).toBeUndefined()
		expect(result.config.saveEndpoint).toBe('/api/settings')
		expect(result.widgets).toHaveLength(3)

		const w1 = result.widgets[0]
		expect(w1.widgetKey).toBe('version-info')
		expect(w1.slot).toBe('section:general')
		expect(w1.gridX).toBe(0)
		expect(w1.gridWidth).toBe(12)

		const w3 = result.widgets[2]
		expect(w3.widgetKey).toBe('debug-panel')
		expect(w3.slot).toBe('section:advanced')
	})

	it('uses slugified title as section id when id is not set', () => {
		const page = {
			id: 'settings',
			type: 'settings',
			title: 'Settings',
			route: '/settings',
			config: {
				sections: [
					{ title: 'My Section', widgets: [{ type: 'widget-a' }] },
				],
			},
		}

		const { page: result } = flattenSettingsSectionWidgets(page)
		expect(result.widgets[0].slot).toBe('section:my-section')
	})

	it('retains fields-body sections in residual sections', () => {
		const page = {
			id: 'settings',
			type: 'settings',
			title: 'Settings',
			route: '/settings',
			config: {
				sections: [
					{ title: 'Widgets Section', id: 'ws', widgets: [{ type: 'w' }] },
					{
						title: 'Fields Section',
						id: 'fs',
						fields: [{ key: 'name', label: 'Name', type: 'string' }],
					},
				],
			},
		}

		const { page: result, count } = flattenSettingsSectionWidgets(page)
		expect(count).toBe(1)
		expect(result.config.sections).toHaveLength(1)
		expect(result.config.sections[0].id).toBe('fs')
	})
})

describe('flattenSettingsTabs', () => {
	it('returns page unchanged when type is not settings', () => {
		const page = { id: 'p', type: 'index', title: 'P', route: '/p', config: {} }
		const { page: result, count } = flattenSettingsTabs(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('returns page unchanged when no tabs', () => {
		const page = { id: 'p', type: 'settings', title: 'P', route: '/p', config: {} }
		const { page: result, count } = flattenSettingsTabs(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('flattens tab section widgets to slot:"tab:<tabId>"', () => {
		const page = {
			id: 'settings',
			type: 'settings',
			title: 'Settings',
			route: '/settings',
			config: {
				tabs: [
					{
						id: 'general',
						label: 'General',
						sections: [
							{ title: 'Basic', id: 'basic', widgets: [{ type: 'input-a' }] },
						],
					},
					{
						id: 'advanced',
						label: 'Advanced',
						sections: [
							{ title: 'Debug', id: 'debug', widgets: [{ type: 'debug-w' }] },
						],
					},
				],
			},
		}

		const { page: result, count } = flattenSettingsTabs(page)
		expect(count).toBe(2)
		expect(result.config.tabs).toBeUndefined()
		expect(result.widgets).toHaveLength(2)

		const w1 = result.widgets[0]
		expect(w1.widgetKey).toBe('input-a')
		expect(w1.slot).toBe('tab:general')
		expect(w1.tabGroup).toBe('basic')
		expect(w1.gridWidth).toBe(12)

		const w2 = result.widgets[1]
		expect(w2.widgetKey).toBe('debug-w')
		expect(w2.slot).toBe('tab:advanced')
	})
})
