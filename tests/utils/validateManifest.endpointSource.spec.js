/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Schema + post-schema tests for the Wave-2 endpoint data binding
 * (nextcloud-vue#91, schema v2.14.0):
 *
 * - `$defs/endpointSource` shape (url required, method enum, params,
 *   responsePath) on stat/delta content and object-table props
 * - `$defs/chartEndpointSource` (labelsPath + series[] {name, path})
 * - exactly-one-of cross-field checks: stat/delta content.source |
 *   content.endpointSource, chart dataSource | props.endpointSource,
 *   object-table props.source | props.endpointSource — on BOTH the v2
 *   pages[].widgets[] grid and the legacy pages[].config.widgets[] catalog
 * - the editor-seeded EMPTY source blob does NOT trip the rule
 *
 * Tests use the public `validateManifest()` dispatcher, which routes v2
 * manifests through the Ajv-compiled schema (regenerated via
 * `npm run build:validators`, never hand-edited).
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal-valid v2 manifest carrying a single dashboard page with
 * the given v2-grid widgets and/or legacy config.widgets.
 *
 * @param {Array<object>} widgets The page's widgets[] entries.
 * @param {object} [config] Extra page config (e.g. legacy widgets).
 * @return {object} A complete v2 manifest.
 */
function manifestWith(widgets, config) {
	const page = {
		id: 'Home',
		route: '/',
		type: 'dashboard',
		title: 'Home',
		widgets,
	}
	if (config) page.config = config
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.1.0',
		menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
		pages: [page],
	}
}

const grid = { slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }

describe('endpointSource — stat/delta on the v2 grid', () => {
	it('accepts the full pipelinq KPI contract (params tokens, trend, variantWhen, clickRoute)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: {
				content: {
					label: 'Revenue',
					icon: 'CashMultiple',
					format: { style: 'currency', currency: 'EUR', decimals: 0 },
					endpointSource: {
						url: '/apps/pipelinq/api/analytics/commercial',
						params: { period: '@workspace.datePreset?' },
					},
					valueField: 'revenue',
					previousField: 'previousPeriod.revenue',
					goodDirection: 'up',
					variantWhen: [
						{ op: 'gte', value: 100000, variant: 'success' },
						{ op: 'lt', value: 10000, variant: 'warning', icon: 'AlertOutline' },
					],
					clickRoute: 'leads',
				},
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a delta widget with endpointSource + deltaField', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'delta',
			...grid,
			props: {
				content: {
					label: 'Leads',
					endpointSource: { url: '/apps/pipelinq/api/analytics/overview', responsePath: 'summary' },
					valueField: 'leads',
					deltaField: 'leadsDeltaPct',
					goodDirection: 'down',
				},
			},
		}]))
		expect(result.valid).toBe(true)
	})

	it('rejects an endpointSource without a url', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: { content: { endpointSource: { params: { period: 'month' } } } },
		}]))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/url/)
	})

	it('rejects an unknown endpointSource key and a bad method', () => {
		const unknownKey = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: { content: { endpointSource: { url: '/x', path: 'oops' } } },
		}]))
		expect(unknownKey.valid).toBe(false)

		const badMethod = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: { content: { endpointSource: { url: '/x', method: 'DELETE' } } },
		}]))
		expect(badMethod.valid).toBe(false)
	})

	it('rejects a variantWhen rule missing op/value/variant or with a bad variant', () => {
		const missing = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: { content: { endpointSource: { url: '/x' }, variantWhen: [{ op: 'gt', value: 1 }] } },
		}]))
		expect(missing.valid).toBe(false)

		const badVariant = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: { content: { endpointSource: { url: '/x' }, variantWhen: [{ op: 'gt', value: 1, variant: 'fancy' }] } },
		}]))
		expect(badVariant.valid).toBe(false)
	})

	it('rejects BOTH a configured source and an endpointSource (exactly-one-of)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: {
				content: {
					source: { register: 'pipelinq', schema: 'lead', metric: 'count' },
					endpointSource: { url: '/api/x' },
				},
			},
		}]))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/BOTH a source and an endpointSource/)
	})

	it('tolerates the editor-seeded EMPTY source blob next to an endpointSource', () => {
		// CnStatWidgetForm seeds `source: { register: '', schema: '', … }` —
		// adding an endpointSource to such a widget must stay valid.
		const result = validateManifest(manifestWith([{
			widgetKey: 'stat',
			...grid,
			props: {
				content: {
					source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
					endpointSource: { url: '/api/x' },
					valueField: 'n',
				},
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})
})

describe('endpointSource — chart mapping', () => {
	it('accepts the pipelinq trends contract (array payload, per-item paths)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: {
				chartKind: 'line',
				endpointSource: {
					url: '/apps/pipelinq/api/analytics/trends',
					params: { metric: 'leads', period: '@workspace.datePreset?' },
					responsePath: 'series',
					labelsPath: 'date',
					series: [{ name: 'Leads', path: 'value' }],
				},
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects a series entry without a path', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: {
				endpointSource: { url: '/x', series: [{ name: 'Leads' }] },
			},
		}]))
		expect(result.valid).toBe(false)
	})

	it('rejects BOTH a dataSource and props.endpointSource (exactly-one-of)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			dataSource: { schema: 'lead', aggregate: 'count' },
			props: { endpointSource: { url: '/x' } },
		}]))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/chart widget declares BOTH a dataSource and props.endpointSource/)
	})
})

describe('endpointSource — object-table rows', () => {
	it('accepts endpoint-bound rows with columns/rowRoute/actions on top', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'object-table',
			...grid,
			props: {
				endpointSource: {
					url: '/apps/pipelinq/api/reports/source-performance',
					params: { from: '@workspace.dateFrom?' },
					responsePath: 'report.sources',
				},
				columns: [{ key: 'source', label: 'Source' }],
				rowRoute: 'lead-detail',
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects BOTH a props.source and a props.endpointSource (exactly-one-of)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'object-table',
			...grid,
			props: {
				source: { register: 'pipelinq', schema: 'lead' },
				endpointSource: { url: '/api/report' },
			},
		}]))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/object-table widget declares BOTH/)
	})
})

describe('endpointSource — legacy pages[].config.widgets[] catalog', () => {
	it('flags a legacy stat def declaring both bindings, accepts one binding', () => {
		const both = validateManifest(manifestWith([], {
			widgets: [{
				id: 'kpi-1',
				type: 'stat',
				content: {
					source: { register: 'pipelinq', schema: 'lead' },
					endpointSource: { url: '/api/x' },
				},
			}],
		}))
		expect(both.valid).toBe(false)
		expect(both.errors.join('\n')).toMatch(/config\/widgets\[0\]/)

		const one = validateManifest(manifestWith([], {
			widgets: [{
				id: 'kpi-1',
				type: 'stat',
				content: { endpointSource: { url: '/api/x' }, valueField: 'n' },
			}],
		}))
		expect(one.errors).toEqual([])
		expect(one.valid).toBe(true)
	})

	it('flags a legacy chart def declaring both bindings', () => {
		const result = validateManifest(manifestWith([], {
			widgets: [{
				id: 'chart-1',
				type: 'chart',
				dataSource: { schema: 'lead', aggregate: 'count' },
				props: { endpointSource: { url: '/api/trends' } },
			}],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/chart widget declares BOTH/)
	})
})

// `valueAxisBaseline` shipped without reaching any validator: its siblings in the
// chart display passthrough (`legendPosition`, `valueFormat`) are enum-typed, but
// this key was not, so a typo validated clean and then fell back to `auto` — the
// exact framing the author was overriding.
describe('chart valueAxisBaseline enum', () => {
	it('accepts each value of the closed enum', () => {
		for (const baseline of ['auto', 'zero', 'fit']) {
			const result = validateManifest(manifestWith([{
				widgetKey: 'chart',
				...grid,
				props: { valueAxisBaseline: baseline },
			}]))
			expect(result.errors).toEqual([])
			expect(result.valid).toBe(true)
		}
	})

	it('rejects a misspelt value on a v2 grid widget', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { valueAxisBaseline: 'zeor' },
		}]))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/valueAxisBaseline/)
	})

	it('rejects a misspelt value on the in-app `content` config', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { content: { valueAxisBaseline: 'none' } },
		}]))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/valueAxisBaseline/)
	})

	it('rejects a misspelt value in the legacy dashboard catalog', () => {
		const result = validateManifest(manifestWith([], {
			widgets: [{
				id: 'chart-1',
				title: 'Trend',
				type: 'chart',
				props: { valueAxisBaseline: 'ZERO' },
			}],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/valueAxisBaseline/)
	})

	it('leaves an omitted baseline alone', () => {
		const result = validateManifest(manifestWith([], {
			widgets: [{ id: 'chart-1', title: 'Trend', type: 'chart', props: { horizontal: true } }],
		}))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})
})
