/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Schema tests for manifest-api-call-verbs-and-toggle (schema v2.34.0):
 * PATCH and DELETE on api-call, and the toggle that reads its state off the
 * page object and writes with one verb each way. The old single-verb toggle
 * must keep validating unchanged.
 *
 * @spec openspec/changes/manifest-api-call-verbs-and-toggle/specs/manifest-api-call-verbs-and-toggle/spec.md
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function withHeaderActions(headerActions) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.1.0',
		menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
		pages: [{ id: 'Home', route: '/', type: 'dashboard', title: 'Home', widgets: [], config: { headerActions } }],
	}
}

const star = {
	id: 'star',
	label: 'Star',
	type: 'toggle',
	labelOn: 'Starred',
	labelOff: 'Star',
	stateFrom: { field: '@self.favourite' },
	on: { method: 'PUT', url: '/apps/openregister/api/objects/dossiq/case/@objectId/favourite' },
	off: { method: 'DELETE', url: '/apps/openregister/api/objects/dossiq/case/@objectId/favourite' },
}

describe('api-call verbs in the schema', () => {
	it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('accepts method %s', (method) => {
		const result = validateManifest(withHeaderActions([
			{ id: 'go', label: 'Go', type: 'api-call', url: '/apps/x/api/go', method },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects a verb the dispatcher does not know', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'go', label: 'Go', type: 'api-call', url: '/apps/x/api/go', method: 'GET' },
		]))
		expect(result.valid).toBe(false)
	})
})

describe('two-verb toggle in the schema', () => {
	it('accepts a star that reads the object and writes PUT on, DELETE off', () => {
		const result = validateManifest(withHeaderActions([star]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a follow button that looks for the signed-in user in a list', () => {
		const result = validateManifest(withHeaderActions([{
			id: 'follow',
			label: 'Follow',
			type: 'toggle',
			stateFrom: { field: 'followers', contains: '@me' },
			on: { method: 'POST', url: '/apps/dossiq/api/cases/@objectId/followers', payload: { user: '@me' } },
			off: { method: 'DELETE', url: '/apps/dossiq/api/cases/@objectId/followers/@me' },
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('lets on and off borrow writeUrl instead of naming their own url', () => {
		const result = validateManifest(withHeaderActions([{
			id: 'pin',
			label: 'Pin',
			type: 'toggle',
			writeUrl: '/apps/x/api/pins/@objectId',
			on: { method: 'PUT' },
			off: { method: 'DELETE' },
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('still accepts the single-verb toggle exactly as it was written before', () => {
		const result = validateManifest(withHeaderActions([{
			id: 'werkplek',
			type: 'toggle',
			label: 'Werkplek',
			labelOn: 'Open',
			labelOff: 'Closed',
			field: 'open',
			stateSource: { url: '/apps/pipelinq/api/werkplek/state', responsePath: 'open' },
			writeUrl: '/apps/pipelinq/api/werkplek/state',
			method: 'PUT',
		}]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects on without off', () => {
		const { off, ...onlyOn } = star
		expect(off).toBeDefined()
		expect(validateManifest(withHeaderActions([onlyOn])).valid).toBe(false)
	})

	it('rejects off without on, even with a writeUrl', () => {
		const { on, ...onlyOff } = star
		expect(on).toBeDefined()
		expect(validateManifest(withHeaderActions([{ ...onlyOff, writeUrl: '/apps/x/api/w' }])).valid).toBe(false)
	})

	it('rejects on/off without a url when there is no writeUrl to fall back to', () => {
		const result = validateManifest(withHeaderActions([{
			...star,
			on: { method: 'PUT' },
		}]))
		expect(result.valid).toBe(false)
	})

	it('rejects a toggle direction without a method', () => {
		const result = validateManifest(withHeaderActions([{
			...star,
			off: { url: '/apps/x/api/w' },
		}]))
		expect(result.valid).toBe(false)
	})

	it('rejects a stateFrom without a field', () => {
		const result = validateManifest(withHeaderActions([{
			...star,
			stateFrom: { contains: '@me' },
		}]))
		expect(result.valid).toBe(false)
	})
})
