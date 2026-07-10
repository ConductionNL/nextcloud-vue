/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Schema tests for the widget-vocabulary seams (nextcloud-vue #89/#91,
 * schema v2.16.0):
 *  - `open-form` action `onSuccessRoute` object form
 *    ({ name, paramField?, objectParam? }) alongside the bare-string form.
 *  - object-table built-in widget declarative `props.rowClass[]`
 *    ({ when: { field, op?, value }, class }).
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

function withHeaderActions(headerActions) {
	return manifestWith([], { config: { headerActions } })
}

describe('Seam #91 — open-form onSuccessRoute object form (v2.16.0)', () => {
	it('accepts the bare-string onSuccessRoute (back-compat)', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', onSuccessRoute: 'Leads' },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts the object form { name, paramField, objectParam }', () => {
		const result = validateManifest(withHeaderActions([
			{
				id: 'new-lead',
				label: 'New lead',
				type: 'open-form',
				register: 'crm',
				schema: 'lead',
				onSuccessRoute: { name: 'LeadDetail', paramField: 'leadId', objectParam: 'object' },
			},
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts the object form with only a name', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', onSuccessRoute: { name: 'LeadDetail' } },
		]))
		expect(result.valid).toBe(true)
	})

	it('rejects an object-form onSuccessRoute without a name', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', onSuccessRoute: { paramField: 'leadId' } },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects an unknown key on the object-form onSuccessRoute', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', onSuccessRoute: { name: 'LeadDetail', bogus: true } },
		]))
		expect(result.valid).toBe(false)
	})
})

describe('Seam #91 — object-table rowClass (v2.16.0)', () => {
	function objectTableWidget(rowClass) {
		return manifestWith([{
			widgetKey: 'object-table',
			...grid,
			props: {
				source: { register: 'procest', schema: 'case' },
				columns: [{ key: 'title', label: 'Title' }],
				rowClass,
			},
		}])
	}

	it('accepts a declarative rowClass rules[] array', () => {
		const result = validateManifest(objectTableWidget([
			{ when: { field: 'status', op: 'eq', value: 'overdue' }, class: 'row--overdue' },
			{ when: { field: 'daysLeft', op: 'lt', value: 3 }, class: 'row--at-risk' },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a rule whose when omits op (defaults to eq)', () => {
		const result = validateManifest(objectTableWidget([
			{ when: { field: 'flag', value: 'red' }, class: 'row--red' },
		]))
		expect(result.valid).toBe(true)
	})

	it('rejects a rule missing its class', () => {
		const result = validateManifest(objectTableWidget([
			{ when: { field: 'status', value: 'overdue' } },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects a rule whose when has no field', () => {
		const result = validateManifest(objectTableWidget([
			{ when: { value: 'overdue' }, class: 'row--overdue' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects an unsupported op on a rule', () => {
		const result = validateManifest(objectTableWidget([
			{ when: { field: 'status', op: 'contains', value: 'x' }, class: 'row--x' },
		]))
		expect(result.valid).toBe(false)
	})
})
