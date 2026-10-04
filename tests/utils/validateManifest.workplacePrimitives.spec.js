/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Schema tests for the workplace dashboard primitives: the `week-strip` and
 * `stacked-bar` widget keys, the attention props of `banner`, `viewCounts`
 * on an index page, and `showCount` on a v1 quick filter.
 *
 * The validator is compiled from the schema (`npm run build:validators`), so
 * these fail when the schema and the components drift apart.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md
 */

import v1Schema from '../../src/schemas/app-manifest.schema.json'
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

const grid = { slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }

/**
 * A minimal valid v2 manifest with one dashboard page.
 *
 * @param {Array<object>} widgets The page's widgets.
 * @return {object} The manifest.
 */
function dashboard(widgets) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.1.0',
		menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
		pages: [
			{ id: 'Home', route: '/', type: 'dashboard', title: 'Home', widgets },
			{ id: 'Other', route: '/other', type: 'dashboard', title: 'Other', widgets: [{ widgetKey: 'text', ...grid, props: { content: { text: 'x' } } }, { widgetKey: 'divider', ...grid, gridY: 2, props: { content: {} } }] },
		],
	}
}

const errorsOf = (manifest) => {
	const result = validateManifest(manifest)
	return result.valid ? [] : result.errors
}

describe('the baseline manifest is valid (control)', () => {
	it('accepts a dashboard of known widgets', () => {
		expect(errorsOf(dashboard([
			{ widgetKey: 'text', ...grid, props: { content: { text: 'x' } } },
			{ widgetKey: 'divider', ...grid, gridY: 2, props: { content: {} } },
		]))).toEqual([])
	})
})

describe('week-strip', () => {
	const strip = (content) => dashboard([
		{ widgetKey: 'week-strip', ...grid, props: { content } },
		{ widgetKey: 'divider', ...grid, gridY: 2, props: { content: {} } },
	])

	it('accepts a source-backed strip', () => {
		expect(errorsOf(strip({
			source: { register: 'dossiq', schema: 'case', filter: { assignee: '@me' }, limit: 50 },
			dateField: 'deadline',
			titleField: 'title',
			metaFields: ['identifier', 'caseType'],
			itemRoute: 'CaseDetail',
			days: 7,
			lateWhen: { op: 'lte', value: 0 },
			emptyText: 'No deadlines',
		}))).toEqual([])
	})

	it('accepts static items', () => {
		expect(errorsOf(strip({
			items: [{ title: 'Meeting', meta: 'Town hall', date: '2026-10-07', route: 'Meetings', late: false }],
		}))).toEqual([])
	})

	it('rejects a day count other than 5 or 7', () => {
		expect(errorsOf(strip({ days: 6 })).length).toBeGreaterThan(0)
	})

	it('rejects a source without a schema', () => {
		expect(errorsOf(strip({ source: { register: 'dossiq' }, dateField: 'deadline' })).length).toBeGreaterThan(0)
	})

	it('rejects a static item without a date', () => {
		expect(errorsOf(strip({ items: [{ title: 'No date' }] })).length).toBeGreaterThan(0)
	})
})

describe('stacked-bar', () => {
	const bar = (content) => dashboard([
		{ widgetKey: 'stacked-bar', ...grid, props: { content } },
		{ widgetKey: 'divider', ...grid, gridY: 2, props: { content: {} } },
	])

	it('accepts a grouped source with an order and labels', () => {
		expect(errorsOf(bar({
			source: { register: 'dossiq', schema: 'case', groupBy: 'status', filter: { assignee: '@me' } },
			order: ['received', 'in_progress'],
			labels: { received: 'Received', in_progress: 'In progress' },
		}))).toEqual([])
	})

	it('accepts static segments', () => {
		expect(errorsOf(bar({ segments: [{ label: 'Phone', value: 9 }, { key: 'mail', label: 'E-mail', value: 4 }] }))).toEqual([])
	})

	it('rejects a source without groupBy', () => {
		expect(errorsOf(bar({ source: { register: 'dossiq', schema: 'case' } })).length).toBeGreaterThan(0)
	})

	it('rejects a negative segment value', () => {
		expect(errorsOf(bar({ segments: [{ label: 'Phone', value: -1 }] })).length).toBeGreaterThan(0)
	})
})

describe('banner attention props', () => {
	const banner = (props) => dashboard([
		{ widgetKey: 'banner', ...grid, props },
		{ widgetKey: 'divider', ...grid, gridY: 2, props: { content: {} } },
	])

	it('still accepts a plain banner', () => {
		expect(errorsOf(banner({ variant: 'warning', text: 'Heads up' }))).toEqual([])
	})

	it('accepts an attention card with two actions', () => {
		expect(errorsOf(banner({
			layout: 'attention',
			variant: 'error',
			kicker: 'First today',
			title: 'Parking permits',
			reason: 'The deadline ends today.',
			actions: [
				{ label: 'Open case', route: { name: 'CaseDetail', params: { id: '61' } }, primary: true },
				{ label: 'All deadlines', route: 'Deadlines' },
			],
		}))).toEqual([])
	})

	it('rejects a third action', () => {
		expect(errorsOf(banner({
			layout: 'attention',
			title: 'T',
			actions: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
		})).length).toBeGreaterThan(0)
	})

	it('rejects an unknown layout and an action without a label', () => {
		expect(errorsOf(banner({ layout: 'hero', text: 'x' })).length).toBeGreaterThan(0)
		expect(errorsOf(banner({ layout: 'attention', title: 'T', actions: [{ route: 'X' }] })).length).toBeGreaterThan(0)
	})
})

describe('counts on an index page', () => {
	const index = (config) => ({
		$schema: V2_SCHEMA_URL,
		version: '2.1.0',
		menu: [{ id: 'Cases', label: 'Cases', route: 'Cases', order: 10 }],
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'dossiq', schema: 'case', ...config } }],
	})

	it('is valid without the key (control)', () => {
		expect(errorsOf(index({}))).toEqual([])
	})

	it('accepts viewCounts as true or as a list of view ids', () => {
		expect(errorsOf(index({ viewCounts: true }))).toEqual([])
		expect(errorsOf(index({ viewCounts: ['mine', 'late'] }))).toEqual([])
	})

	it('rejects viewCounts of another type', () => {
		expect(errorsOf(index({ viewCounts: 'all' })).length).toBeGreaterThan(0)
	})

	it('declares showCount on a v1 quick filter, whose items take no unknown keys', () => {
		const item = v1Schema.$defs.page.properties.config.properties.quickFilters.items
		expect(item.additionalProperties).toBe(false)
		expect(item.properties.showCount).toMatchObject({ type: 'boolean', default: false })
	})
})
