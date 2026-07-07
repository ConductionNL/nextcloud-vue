/**
 * Validation cases for the list-widget-enrichment schema additions
 * (ADR-049 / "v2 manifest schema and compiled validator accept the new
 * fields"):
 * - object-table widget props.source (register/schema/filter/order/limit)
 * - object-op action type (op patch|delete|create, values, confirm)
 * - stats-block widget props.entries[]
 * - invalid op fails validation; op is required for type object-op
 * - dataSource | entries mutual exclusion (post-schema check)
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * A v2 manifest with one dashboard page carrying the given widgets.
 *
 * @param {Array<object>} widgets The page's widgets[] array.
 * @return {object} The manifest.
 */
function manifestWith(widgets) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.0.0',
		menu: [],
		pages: [
			{
				id: 'dashboard',
				route: '/',
				type: 'dashboard',
				title: 'Dashboard',
				widgets,
			},
		],
	}
}

const OBJECT_TABLE_WIDGET = {
	widgetKey: 'object-table',
	slot: 'body',
	gridX: 0,
	gridY: 0,
	gridWidth: 6,
	gridHeight: 6,
	props: {
		source: {
			register: '@resolve:tenant_register',
			schema: 'case',
			filter: { assignee: '@me', status: '@workspace.openStatus?' },
			order: { dueDate: 'asc' },
			limit: 5,
		},
		columns: ['title', 'dueDate'],
		hideHeader: true,
		rowRoute: 'case-detail',
		emptyText: 'No cases',
		actions: [
			{ id: 'accept', label: 'Accept', type: 'object-op', op: 'patch', values: { status: 'accepted' } },
			{ id: 'remove', label: 'Remove', type: 'object-op', op: 'delete', confirm: true },
			{ id: 'add', label: 'Add', type: 'object-op', op: 'create', values: { status: 'open' } },
		],
	},
}

const STATS_BLOCK_WIDGET = {
	widgetKey: 'stats-block',
	slot: 'body',
	gridX: 6,
	gridY: 0,
	gridWidth: 6,
	gridHeight: 6,
	props: {
		entries: [
			{
				title: 'Expiring soon',
				register: 'docudesk',
				schema: 'document',
				metric: 'count',
				filter: { retention: { lt: '@today+30d' } },
				route: { name: 'documents' },
				variant: 'warning',
				countLabel: 'documents',
				hideWhenZero: true,
			},
			{ title: 'Archived', register: 'docudesk', schema: 'document', filter: { status: 'archived' } },
		],
	},
}

describe('v2 schema — list-widget-enrichment additions (positive)', () => {
	it('a manifest with object-table source + object-op actions + multi-entry stats-block validates', () => {
		const result = validateManifestV2(manifestWith([OBJECT_TABLE_WIDGET, STATS_BLOCK_WIDGET]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('a stats-block widget with a single dataSource (no entries) still validates', () => {
		const widget = {
			widgetKey: 'stats-block',
			slot: 'body',
			gridX: 0,
			gridY: 0,
			gridWidth: 4,
			gridHeight: 4,
			dataSource: { register: 'decidesk', schema: 'minutes', filter: { lifecycle: 'review' }, aggregate: 'count' },
			props: { countLabel: 'minutes' },
		}
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})
})

describe('v2 schema — list-widget-enrichment additions (negative)', () => {
	it('an object-op action with an invalid op fails validation', () => {
		const widget = JSON.parse(JSON.stringify(OBJECT_TABLE_WIDGET))
		widget.props.actions = [{ id: 'boom', label: 'Boom', type: 'object-op', op: 'truncate' }]
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('op') || e.includes('enum'))).toBe(true)
	})

	it('an object-op action without an op fails validation', () => {
		const widget = JSON.parse(JSON.stringify(OBJECT_TABLE_WIDGET))
		widget.props.actions = [{ id: 'boom', label: 'Boom', type: 'object-op' }]
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.valid).toBe(false)
	})

	it('an object-table source without register/schema fails validation', () => {
		const widget = JSON.parse(JSON.stringify(OBJECT_TABLE_WIDGET))
		widget.props.source = { filter: { a: 1 } }
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.valid).toBe(false)
	})

	it('an object-table source with a typo field fails validation (additionalProperties)', () => {
		const widget = JSON.parse(JSON.stringify(OBJECT_TABLE_WIDGET))
		widget.props.source.fliter = { a: 1 }
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.valid).toBe(false)
	})

	it('a stats-block entry without register/schema fails validation', () => {
		const widget = JSON.parse(JSON.stringify(STATS_BLOCK_WIDGET))
		widget.props.entries = [{ title: 'Broken' }]
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.valid).toBe(false)
	})

	it('a stats-block declaring BOTH dataSource and entries fails the post-schema check', () => {
		const widget = JSON.parse(JSON.stringify(STATS_BLOCK_WIDGET))
		widget.dataSource = { register: 'docudesk', schema: 'document', aggregate: 'count' }
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('exactly one'))).toBe(true)
	})

	it('a stats-block with props.dataSource AND entries also fails the post-schema check', () => {
		const widget = JSON.parse(JSON.stringify(STATS_BLOCK_WIDGET))
		widget.props.dataSource = { register: 'docudesk', schema: 'document', aggregate: 'count' }
		const result = validateManifestV2(manifestWith([widget]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('exactly one'))).toBe(true)
	})
})
