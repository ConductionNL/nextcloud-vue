/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Schema tests for the Wave-1 widget vocabulary (nextcloud-vue#91):
 *
 * - `banner` widgetKey: variant enum + visibleWhen predicate shape
 * - `audit-trail` widgetKey: optional context props
 * - `chart` display passthrough keys (horizontal / legendPosition /
 *   valueFormat / colorMap / emptyLabel)
 * - `header` / `text` / `divider` on the v2 grid (props.content)
 * - `type: "export"` action with entities[] / formats[] / description
 * - the new built-in keys are exempt from the single-widget dashboard rule
 *
 * Tests use the public `validateManifest()` dispatcher, which routes v2
 * manifests through the Ajv-compiled schema (regenerated via
 * `npm run build:validators`, never hand-edited).
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal-valid v2 manifest carrying a single dashboard page with
 * the given widgets and actions.
 *
 * @param {Array<object>} widgets The page's widgets[] entries.
 * @param {Array<object>} [actions] The page's actions[] entries.
 * @return {object} A complete v2 manifest.
 */
function manifestWith(widgets, actions = []) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.1.0',
		menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
		pages: [
			{
				id: 'Home',
				route: '/',
				type: 'dashboard',
				title: 'Home',
				widgets,
				actions,
			},
		],
	}
}

const grid = { slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }

describe('Wave-1 widget vocabulary — banner', () => {
	it('accepts a full banner declaration (endpoint predicate + route)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'banner',
			...grid,
			props: {
				variant: 'warning',
				text: 'Migrations pending',
				visibleWhen: { endpoint: '/apps/doriath/api/migrations/status', field: 'pending', op: 'gt', value: 0 },
				route: 'migrations',
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts an OR-source predicate with a token filter', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'banner',
			...grid,
			props: {
				text: 'Open tasks',
				visibleWhen: {
					source: { register: 'pipelinq', schema: 'task', filter: { assignee: '@me' } },
					op: 'gt',
					value: 0,
				},
			},
		}]))
		expect(result.valid).toBe(true)
	})

	it('rejects an unknown banner variant', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'banner',
			...grid,
			props: { variant: 'fancy', text: 'x' },
		}]))
		expect(result.valid).toBe(false)
	})

	it('rejects an unknown visibleWhen operator', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'banner',
			...grid,
			props: { text: 'x', visibleWhen: { endpoint: '/x', field: 'a', op: 'matches', value: 1 } },
		}]))
		expect(result.valid).toBe(false)
	})
})

describe('Wave-1 widget vocabulary — audit-trail', () => {
	it('accepts a bare audit-trail entry (context-fed) and explicit props', () => {
		expect(validateManifest(manifestWith([{ widgetKey: 'audit-trail', ...grid }])).valid).toBe(true)
		expect(validateManifest(manifestWith([{
			widgetKey: 'audit-trail',
			...grid,
			props: { register: 'procest', schema: 'case', objectId: 'uuid-1', title: 'Changes', maxDisplay: 3 },
		}])).valid).toBe(true)
	})

	it('rejects a non-positive maxDisplay', () => {
		expect(validateManifest(manifestWith([{
			widgetKey: 'audit-trail',
			...grid,
			props: { maxDisplay: 0 },
		}])).valid).toBe(false)
	})
})

describe('Wave-1 widget vocabulary — chart display passthrough', () => {
	it('accepts the five display keys (string valueFormat)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: {
				chartKind: 'bar',
				horizontal: true,
				legendPosition: 'right',
				valueFormat: 'currency-compact',
				colorMap: { open: '#00aa00', closed: '#aa0000' },
				emptyLabel: 'No revenue yet',
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts the object valueFormat form and rejects an unknown formatter name', () => {
		expect(validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { valueFormat: { name: 'currency', currency: 'USD', decimals: 0 } },
		}])).valid).toBe(true)
		expect(validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { valueFormat: 'scientific' },
		}])).valid).toBe(false)
	})

	it('rejects an unknown legendPosition', () => {
		expect(validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { legendPosition: 'middle' },
		}])).valid).toBe(false)
	})
})

describe('Wave-1 widget vocabulary — header/text/divider on the v2 grid', () => {
	it('accepts the catalog presentation widgets with a props.content blob', () => {
		const result = validateManifest(manifestWith([
			{ widgetKey: 'header', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, props: { content: { title: 'Welcome' } } },
			{ widgetKey: 'text', slot: 'body', gridX: 0, gridY: 2, gridWidth: 6, gridHeight: 2, props: { content: { text: 'Hello', contentMode: 'markdown' } } },
			{ widgetKey: 'divider', slot: 'body', gridX: 0, gridY: 4, gridWidth: 12, gridHeight: 1, props: { content: { style: 'line' } } },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})
})

describe('Wave-1 actions vocabulary — export', () => {
	it('accepts a full export action (the pipelinq ReportExportPanel case)', () => {
		const result = validateManifest(manifestWith([], [{
			id: 'report-export',
			label: 'Download report',
			type: 'export',
			description: 'CSV / Excel / JSON reports for funders.',
			entities: [
				{ id: 'leads', label: 'Leads' },
				{ id: 'requests', label: 'Requests' },
			],
			formats: ['excel', 'csv', { id: 'json', label: 'JSON (.json)' }],
			handler: 'exportReport',
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a minimal export action (dialog defaults apply)', () => {
		expect(validateManifest(manifestWith([], [
			{ id: 'x', label: 'Export', type: 'export', handler: 'exportAll' },
		])).valid).toBe(true)
	})

	it('rejects a malformed entities entry', () => {
		expect(validateManifest(manifestWith([], [
			{ id: 'x', label: 'Export', type: 'export', entities: [{ id: 'leads' }] },
		])).valid).toBe(false)
	})
})

describe('Wave-1 — single-widget dashboard exemption', () => {
	it('a single full-grid banner does NOT trip the single-widget dashboard rule', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'banner',
			slot: 'body',
			gridX: 0,
			gridY: 0,
			gridWidth: 12,
			gridHeight: 12,
			props: { text: 'x' },
		}]))
		expect(result.valid).toBe(true)
	})
})
