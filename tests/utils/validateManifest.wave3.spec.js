/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Schema tests for the Wave-3 vocabulary (nextcloud-vue#91, schema
 * v2.15.0): chart dataSource.aggregate OBJECT form + drilldown + views,
 * the new action types (open-form / refresh / api-call / toggle) + their
 * required-field allOf branches + visibleWhen, and the workspace-filter /
 * kb-search catalog widget content.
 *
 * Uses the public `validateManifest()` dispatcher through the Ajv-compiled
 * schema (regenerated via build:validators, never hand-edited).
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

const grid = { slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }

function manifestWith(widgets, pageExtra) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.1.0',
		menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
		pages: [{ id: 'Home', route: '/', type: 'dashboard', title: 'Home', widgets, ...(pageExtra || {}) }],
	}
}

describe('Wave 3 — chart aggregate + drilldown + views', () => {
	it('accepts the OBJECT-form aggregate with topN / otherBucket / labelResolve + drilldown + views', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: {
				chartKind: 'donut',
				views: [
					{ key: 'count', label: '#' },
					{ key: 'pct', label: '%', valueFormat: 'percent' },
				],
			},
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: {
					groupBy: 'billingCategory',
					metric: 'sum',
					sumField: 'hours',
					topN: 10,
					otherBucket: true,
					labelResolve: { schema: 'billingCategory', labelField: 'name', colorField: 'color' },
				},
				drilldown: { route: 'TimeEntries', filterParam: 'billingCategory' },
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('still accepts the STRING aggregate: count shorthand (back-compat)', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { chartKind: 'bar' },
			dataSource: { register: 'crm', schema: 'request', aggregate: 'count' },
		}]))
		expect(result.valid).toBe(true)
	})

	it('rejects an aggregate object missing groupBy', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { chartKind: 'donut' },
			dataSource: { register: 'crm', schema: 'request', aggregate: { metric: 'count' } },
		}]))
		expect(result.valid).toBe(false)
	})

	it('rejects a drilldown missing filterParam', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'chart',
			...grid,
			props: { chartKind: 'donut' },
			dataSource: { register: 'crm', schema: 'request', aggregate: { groupBy: 'status' }, drilldown: { route: 'X' } },
		}]))
		expect(result.valid).toBe(false)
	})
})

describe('Wave 3 — headerActions action types', () => {
	function withHeaderActions(headerActions) {
		return manifestWith([], { config: { headerActions } })
	}

	it('accepts open-form / api-call / toggle / refresh with visibleWhen', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', onSuccessRoute: 'Leads', variant: 'primary' },
			{
				id: 'approve',
				label: 'Approve',
				type: 'api-call',
				url: '/apps/shillinq/api/payment-runs/@objectId/approve',
				method: 'POST',
				confirm: true,
				successMessage: 'Approved',
				visibleWhen: { field: 'state', op: 'eq', value: 'pending' },
			},
			{
				id: 'werkplek',
				type: 'toggle',
				label: 'Werkplek',
				labelOn: 'Open',
				labelOff: 'Closed',
				field: 'open',
				stateSource: { url: '/apps/pipelinq/api/werkplek/state', responsePath: 'open' },
				writeUrl: '/apps/pipelinq/api/werkplek/state',
				method: 'PUT',
			},
			{ id: 'refresh', label: 'Refresh', type: 'refresh' },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects an api-call without a url', () => {
		const result = validateManifest(withHeaderActions([{ id: 'x', label: 'X', type: 'api-call' }]))
		expect(result.valid).toBe(false)
	})

	it('accepts an api-call with payload / download / filename', () => {
		const result = validateManifest(withHeaderActions([
			{
				id: 'generate-pdf',
				label: 'Generate PDF',
				type: 'api-call',
				url: '/apps/docudesk/api/documents/generate',
				method: 'POST',
				payload: {
					template: 'invoice',
					dataRefs: [{ register: 'crm', schema: 'lead', id: '@objectId' }],
				},
				download: true,
				filename: 'invoice-@objectId.pdf',
				successMessage: 'Document generated',
			},
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects an open-form without a schema', () => {
		const result = validateManifest(withHeaderActions([{ id: 'x', label: 'X', type: 'open-form' }]))
		expect(result.valid).toBe(false)
	})

	it('rejects a toggle without a writeUrl', () => {
		const result = validateManifest(withHeaderActions([{ id: 'x', label: 'X', type: 'toggle', field: 'open' }]))
		expect(result.valid).toBe(false)
	})

	it('rejects a visibleWhen with an unknown operator', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'x', label: 'X', type: 'refresh', visibleWhen: { field: 'a', op: 'contains', value: 1 } },
		]))
		expect(result.valid).toBe(false)
	})

	it('accepts a type:agent action (hermiq#41) with skill / prompt / resultField / register / schema', () => {
		const result = validateManifest(withHeaderActions([
			{
				id: 'summarise',
				label: 'Summarise',
				type: 'agent',
				agent: 'agent-uuid-1',
				skill: 'summarise-v1',
				prompt: 'Summarise @object.title',
				resultField: 'aiSummary',
				register: 'crm',
				schema: 'lead',
				objectId: '@objectId',
				confirm: true,
				successMessage: 'Run queued',
				visibleWhen: { field: 'state', op: 'eq', value: 'open' },
			},
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a minimal type:agent action (agent only — register/schema/objectId default to page context)', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'run', label: 'Run', type: 'agent', agent: 'agent-uuid-1' },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects a type:agent action without an agent', () => {
		const result = validateManifest(withHeaderActions([{ id: 'x', label: 'X', type: 'agent' }]))
		expect(result.valid).toBe(false)
	})
})

describe('Wave 3 — workspace-filter + kb-search catalog widgets', () => {
	it('accepts a workspace-filter widget with an OR-source and counts', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'workspace-filter',
			...grid,
			props: {
				content: {
					label: 'Queue',
					writes: '@workspace.queue',
					style: 'radio',
					allLabel: 'All',
					showCounts: true,
					source: { register: 'pipelinq', schema: 'werkitem', groupBy: 'queue' },
				},
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects a workspace-filter with an invalid style', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'workspace-filter',
			...grid,
			props: { content: { writes: '@workspace.q', style: 'dropdown' } },
		}]))
		expect(result.valid).toBe(false)
	})

	it('accepts a kb-search widget with a provider + space/tags + fallback', () => {
		const result = validateManifest(manifestWith([{
			widgetKey: 'kb-search',
			...grid,
			props: {
				content: {
					provider: 'xwiki',
					space: 'Support',
					tags: ['printer', 'network'],
					bindTo: 'activeSummary',
					minChars: 3,
					limit: 8,
					externalOpen: true,
					unavailableFallback: 'KB offline',
				},
			},
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})
})
