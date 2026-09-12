/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Schema tests for the `run-node` action type (manifest-run-node-action,
 * or-flow-run-node's frontend half): invokes one OpenRegister flow node
 * directly against the page object. See design.md's "Naming" decision for
 * why this is NOT called `run-action` — that name is already taken by the
 * UNRELATED setup-wizard step type at `setup.steps[].type`, and this test
 * file's second describe block pins that the two enums do not cross-validate.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

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

describe('run-node action — schema acceptance', () => {
	it('accepts a run-node action with flowId, nodeId and a token-resolved subject', () => {
		const result = validateManifest(withHeaderActions([
			{
				id: 'generate-document',
				label: 'Generate document',
				type: 'run-node',
				flowId: 'flow-uuid-1',
				nodeId: 'merge-template',
				subject: '@objectId',
				successMessage: 'Document generated',
				errorMessage: 'Could not generate the document',
				refresh: true,
			},
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects a run-node action missing flowId', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'x', label: 'X', type: 'run-node', nodeId: 'merge-template' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects a run-node action missing nodeId', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'x', label: 'X', type: 'run-node', flowId: 'flow-uuid-1' },
		]))
		expect(result.valid).toBe(false)
	})

	it('accepts a run-node action with no subject declared (defaults resolved by the rendering surface)', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'x', label: 'X', type: 'run-node', flowId: 'flow-uuid-1', nodeId: 'merge-template' },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})
})

describe('run-node vs the setup-wizard run-action — the two type enums do not cross-validate', () => {
	it('a manifest with BOTH a header run-node action and a setup run-action step validates', () => {
		const manifest = manifestWith([], {
			config: {
				headerActions: [
					{ id: 'generate-document', label: 'Generate document', type: 'run-node', flowId: 'flow-uuid-1', nodeId: 'merge-template' },
				],
			},
		})
		manifest.setup = {
			steps: [{ id: 'demo', type: 'run-action' }],
		}

		const result = validateManifest(manifest)
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects a header action of type "run-action" — that enum member belongs only to setup steps', () => {
		const result = validateManifest(withHeaderActions([
			{ id: 'x', label: 'X', type: 'run-action' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects a setup step of type "run-node" — that enum member belongs only to header/row actions', () => {
		const manifest = manifestWith([])
		manifest.setup = {
			steps: [{ id: 'demo', type: 'run-node' }],
		}

		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
	})
})
